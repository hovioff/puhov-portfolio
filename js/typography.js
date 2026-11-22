const shortWords = /(^|[^\p{L}\p{N}_])(в|во|к|ко|с|со|у|о|об|от|до|из|за|на|по|под|при|без|для|над|про|а|и|но|не|же|ли|это|этот|эта|эти|этого|который|которая|которые|которых|котором|которой|которыми|чем)\s+(?=\S)/giu;

export function polishTypography(root = document) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input,code,pre,[contenteditable],button,.slide-count')) continue;
    const polished = node.nodeValue.replace(shortWords, '$1$2\u00a0');
    if (polished !== node.nodeValue) node.nodeValue = polished;
  }
}
