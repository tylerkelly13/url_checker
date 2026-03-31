import needle from 'needle';

/** Result of fetching page content over HTTP. */
export type getContentResult = {
  url: string;
  content: string;
};

export type getStatusResult = {
  url: string;
  statusCode: string;
  statusMsg: string;
};

/**
 * Get the page content over HTTP.
 *
 * @param url URL of the page to get.
 * @returns URL and page content.
 */
export const getContent = async (url: string): Promise<getContentResult> => {
  const content = await needle('get', url)
    .then(response => {
      return response.body;
    })
    .catch(error => {
      return error.message;
    });
  return { url, content };
};

/**
 * Check the status of the URL over HTTP.
 *
 * @param url URL to check.
 * @returns URL, status code, and message.
 */
export const getStatus = async (url: string): Promise<getStatusResult> => {
  const { statusCode, statusMessage } = await needle('get', url)
    .then(Response => {
      return {
        statusCode: Response.statusCode || '',
        statusMessage: Response.statusMessage
      };
    })
    .catch(error => {
      return {
        statusCode: 999,
        statusMessage: 'Request failed: ' + error
      };
    });
  return {
    url,
    statusCode: statusCode.toString(),
    statusMsg: statusMessage || ''
  };
};
