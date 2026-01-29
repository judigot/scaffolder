import crypto from "node:crypto";

interface IAwsCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	sessionToken?: string;
}

interface IValidationResult {
	valid: boolean;
	error?: string;
}

const STS_HOST = "sts.amazonaws.com";
const STS_REGION = "us-east-1";
const STS_SERVICE = "sts";
const ALGORITHM = "AWS4-HMAC-SHA256";

const sha256 = (data: string): string => {
	return crypto.createHash("sha256").update(data, "utf8").digest("hex");
};

const hmacSha256 = (key: Buffer | string, data: string): Buffer => {
	return crypto
		.createHmac("sha256", key)
		.update(data, "utf8")
		.digest();
};

const getSigningKey = (
	secretKey: string,
	dateStamp: string,
	region: string,
	service: string,
): Buffer => {
	const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
	const kRegion = hmacSha256(kDate, region);
	const kService = hmacSha256(kRegion, service);
	return hmacSha256(kService, "aws4_request");
};

export const validateAwsCredentials = async (
	credentials: IAwsCredentials,
): Promise<IValidationResult> => {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
	const dateStamp = amzDate.slice(0, 8);

	const requestBody = "Action=GetCallerIdentity&Version=2011-06-15";
	const payloadHash = sha256(requestBody);

	const headers: Record<string, string> = {
		host: STS_HOST,
		"x-amz-date": amzDate,
		"content-type": "application/x-www-form-urlencoded; charset=utf-8",
	};

	if (credentials.sessionToken) {
		headers["x-amz-security-token"] = credentials.sessionToken;
	}

	const signedHeaderKeys = Object.keys(headers).sort();
	const signedHeaders = signedHeaderKeys.join(";");

	const canonicalHeaders = signedHeaderKeys
		.map((key) => `${key}:${headers[key]}\n`)
		.join("");

	const canonicalRequest = [
		"POST",
		"/",
		"",
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join("\n");

	const credentialScope = `${dateStamp}/${STS_REGION}/${STS_SERVICE}/aws4_request`;
	const stringToSign = [
		ALGORITHM,
		amzDate,
		credentialScope,
		sha256(canonicalRequest),
	].join("\n");

	const signingKey = getSigningKey(
		credentials.secretAccessKey,
		dateStamp,
		STS_REGION,
		STS_SERVICE,
	);
	const signature = hmacSha256(signingKey, stringToSign).toString("hex");

	const authorizationHeader = `${ALGORITHM} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	const fetchHeaders: Record<string, string> = {
		...headers,
		Authorization: authorizationHeader,
	};

	try {
		const response = await fetch(`https://${STS_HOST}/`, {
			method: "POST",
			headers: fetchHeaders,
			body: requestBody,
		});

		if (response.ok) {
			return { valid: true };
		}

		const responseText = await response.text();

		if (response.status === 403) {
			if (responseText.includes("InvalidClientTokenId")) {
				return {
					valid: false,
					error: "AWS access key ID is invalid.",
				};
			}
			if (responseText.includes("SignatureDoesNotMatch")) {
				return {
					valid: false,
					error: "AWS secret access key is incorrect.",
				};
			}
			if (responseText.includes("ExpiredToken")) {
				return {
					valid: false,
					error: "AWS session token has expired.",
				};
			}
			return {
				valid: false,
				error: "AWS credentials are not authorized. Check your access key, secret key, and session token.",
			};
		}

		return {
			valid: false,
			error: `AWS credential check failed (HTTP ${String(response.status)}).`,
		};
	} catch (fetchError: unknown) {
		if (fetchError instanceof Error) {
			return {
				valid: false,
				error: `Unable to verify AWS credentials: ${fetchError.message}`,
			};
		}
		return {
			valid: false,
			error: "Unable to verify AWS credentials.",
		};
	}
};
