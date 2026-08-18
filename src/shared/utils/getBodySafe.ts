export async function getBodySafe(response: Response) {
  const responseCopy = response.clone();
  const contentType = responseCopy.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return await responseCopy.json();
  }
  return await responseCopy.text();
}
