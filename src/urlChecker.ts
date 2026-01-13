import * as URL from './urlFunctions';
import * as pageFun from './contentFunctions';
import * as http from './http';

export const urlChecker = async (
  url: string,
  selector?: string
): Promise<URL.results[]> => {
  // validate
  const parentURL = URL.goOrNoGo(url);
  URL.whichProtocol(parentURL);
  // getContent
  const resultsArray: Promise<URL.results>[] = await http
    .getContent(parentURL)
    .then((parentPage) => {
      return pageFun.selectContent(
        { body: parentPage.content, parentURL: parentPage.url },
        selector
      );
    })
    .then((parentContent) => {
      return { urls: pageFun.getUrls(parentContent), content: parentContent };
    })
    .then((urlsFoundInParent) => {
      return urlsFoundInParent.urls.map(async (url) => {
        const res = await URL.checkAndReturn(url, urlsFoundInParent.content);
        return res;
      });
    });
  const finalResults = Promise.all(resultsArray).then();
  return finalResults;
};
