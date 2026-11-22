import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser.ts";
import {
	decryptUserMetadataEnv,
	decryptUserMetadataInfra,
} from "@/utils/decryptUserMetadata.ts";
import { getPassphraseFromSession } from "@/utils/passphraseSession.ts";

/**
 * Hook that provides decrypted user metadata for template processing.
 * Automatically decrypts environment variables if a passphrase is available in session.
 * Returns the original metadata if no passphrase is available or if decryption fails.
 */
export function useDecryptedUserMetadata(): {
	decryptedMetadata: Record<string, unknown> | null;
	isLoading: boolean;
	/** Metadata request failure (auth/network/server); null when healthy. */
	error: Error | null;
	retry: () => Promise<void>;
	isRetrying: boolean;
} {
	const {
		user,
		userMetadata,
		isLoading: isUserLoading,
		isMetadataLoaded,
		metadataError,
		refetchMetadata,
		isMetadataFetching,
	} = useUser();
	const [decryptedMetadata, setDecryptedMetadata] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

	useEffect(() => {
		if (isUserLoading) {
			setDecryptedMetadata(null);
			return;
		}
		if (userMetadata === null) {
			// A successful response with no metadata (new account) is an empty
			// state, not a loading state: never leave consumers on a skeleton.
			setDecryptedMetadata(isMetadataLoaded ? {} : null);
			return;
		}

		// If no user ID, return metadata as-is
		if (user?.sub === undefined || user.sub === "") {
			setDecryptedMetadata(userMetadata);
			return;
		}

		const userId = user.sub;

		// Check if we have a passphrase in session
		const passphrase = getPassphraseFromSession(userId);
		if (passphrase === null) {
			// No passphrase available, return metadata as-is (may contain encrypted values)
			setDecryptedMetadata(userMetadata);
			return;
		}

		// Decrypt the metadata
		setIsDecrypting(true);
		decryptUserMetadataEnv(userMetadata, userId, passphrase)
			.then((envDecrypted) =>
				decryptUserMetadataInfra(
					envDecrypted ?? userMetadata,
					userId,
					passphrase,
				),
			)
			.then((decrypted) => {
				setDecryptedMetadata(decrypted ?? userMetadata);
			})
			.catch(() => {
				// If decryption fails, return original metadata
				setDecryptedMetadata(userMetadata);
			})
			.finally(() => {
				setIsDecrypting(false);
			});
	}, [user?.sub, userMetadata, isUserLoading, isMetadataLoaded]);

	return {
		decryptedMetadata,
		isLoading: isUserLoading || isDecrypting,
		error: metadataError,
		retry: refetchMetadata,
		isRetrying: isMetadataFetching,
	};
}
