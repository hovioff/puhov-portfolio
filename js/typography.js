const shortWords = /(^|\s)(в|во|к|ко|с|со|у|о|об|от|до|из|за|на|по|под|при|без|для|над|про|а|и|но|не|же|ли)\s+(?=\S)/giu;

export function polishTypography(root = document) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input,code,pre,[contenteditable],button,.slide-count')) continue;
    node.nodeValue = node.nodeValue.replace(shortWords, '$1$2\u00a0');
  }
}
