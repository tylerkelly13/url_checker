import needle from 'needle';

interface getContentResult {
  url: string,
  content: string
}

interface getStatusResult {
  url: string,
  statusCode: string,
  statusMsg: string
};

async function getContent (url:string): Promise<getContentResult> {
  /**
   * Gets the page content over HTTP. Returns the content as a string.
   *
   * @param url URL of the page to get.
   * @return URL and page content.
   */
  const content = await needle('get', url)
    .then(response => {
      return response.body;
    })
    .catch(error => {
      return error.message;
    });
  return { url, content };
}

async function getStatus (url:string): Promise<getStatusResult> {
  /**
   * Checks the status of the URL over HTTP, returns the URL and the response status code.
   *
   * @param url URL to be checked.
   * @return URL and status code and message.
   */
  const { statusCode, statusMessage } = await needle('get', url)
    .then(Response => {
      return { statusCode: Response.statusCode || '', statusMessage: Response.statusMessage };
    })
    .catch(error => {
      return {
        statusCode: 999,
        statusMessage: 'Request failed: ' + error
      };
    });
  return { url, statusCode: statusCode.toString(), statusMsg: statusMessage || '' };
}

export {
  getContentResult,
  getStatusResult,
  getContent,
  getStatus
};
