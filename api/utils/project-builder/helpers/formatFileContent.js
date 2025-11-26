export const formatFileContent = (content) => {
  return content
    .replace(/\\n/g, '\n') // Replace \n with actual newlines
    .replace(/\\t/g, '    ') // Replace \t with four spaces
    .replace(/\t/g, '    ') // Replace tab characters with four spaces
    .trim();
};
