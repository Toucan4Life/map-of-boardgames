import DOMPurify from 'dompurify'
import { marked, type Tokens } from 'marked'
import { baseUrl } from 'marked-base-url'
let currentRepoURL = ''
let currentRawRepoUrl = ''

export async function getMarkdownContent(markdownString: string, repoName: string, branch: string) {
  initMarkedRenderer()

  currentRepoURL = 'https://github.com/' + repoName
  currentRawRepoUrl = 'https://raw.githubusercontent.com/' + repoName + '/' + branch
  marked.use(baseUrl(`https://github.com/${repoName}/blob/${branch}/`))
  const unsafeDOM = await marked.parse(markdownString)
  return DOMPurify.sanitize(unsafeDOM)
}

function initMarkedRenderer() {
  const renderer = new marked.Renderer()
  // const repoUrl = 'https://github.com/' + repo + '/' + branch;
  renderer.link = function (link: Tokens.Link) {
    if (link.href.startsWith('#')) {
      link.href = currentRepoURL + link.href
    }
    if (link.href.startsWith('./')) {
      // https://raw.githubusercontent.com/nocodb/nocodb/develop
      // https://github.com/nocodb/nocodb/blob/develop/packages/nc-gui/assets/img/icons/512x512.png
      link.href = currentRepoURL + link.href.slice(2)
    }
    return marked.Renderer.prototype.link.call(this, link)
  }
  renderer.image = function (image: Tokens.Image) {
    return marked.Renderer.prototype.image.call(this, getNormalizedImageLink(image))
  }
  renderer.html = function (HtmlTag: Tokens.HTML | Tokens.Tag) {
    const imgRegex = /<img.*?src="(.*?)".*?>/g
    HtmlTag.text = HtmlTag.text.replace(imgRegex, (match, src) => {
      src = getNormalizedImageLink(src)
      return match.replace(/src="(.*?)"/, `src="${src}"`)
    })
    return marked.Renderer.prototype.html.call(this, HtmlTag)
  }

  function getNormalizedImageLink(image: Tokens.Image) {
    const isRelative = !(
      image.href.startsWith('http') ||
      image.href.startsWith('data:') ||
      image.href.startsWith('blob:') ||
      image.href.startsWith('ftp:')
    )
    if (isRelative) {
      image.href = currentRawRepoUrl + '/' + image.href
    }
    return image
  }

  marked.use({ renderer })
}
