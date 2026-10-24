import sanitizeHtml from 'sanitize-html';

const SVG_TAGS = ['svg', 'title', 'desc', 'g', 'path', 'rect', 'text', 'circle', 'defs', 'clipPath'];
const SVG_ATTRS = [
  'viewBox', 'role', 'aria-labelledby', 'stroke', 'stroke-width', 'stroke-dasharray', 'fill',
  'd', 'x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'text-anchor', 'font-size',
  'font-family', 'font-weight', 'clip-path',
];

export const sanitizeContent = (html: string): string =>
  sanitizeHtml(html, {
    // 原稿裡的 button／input／output／label 是需要 script 的互動小工具，靜態頁一律移除。
    allowedTags: [
      'section', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'b', 'i', 'sub', 'small', 'span', 'div',
      'blockquote', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'br', 'a', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', ...SVG_TAGS,
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'lang', 'role', 'aria-label', 'aria-live', 'aria-hidden', ...SVG_ATTRS],
      a: ['href', 'target', 'rel', 'data-resource-id', 'data-section-id'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    transformTags: {
      a: (tagName, attribs) => {
        const resourceId = attribs['data-resource-id'];
        if (resourceId) {
          const section = attribs['data-section-id'];
          return { tagName, attribs: { ...attribs, href: `/literature/${resourceId}${section ? `#${section}` : ''}` } };
        }
        return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } };
      },
    },
  });
