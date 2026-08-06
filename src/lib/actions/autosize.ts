/**
 * Grows a textarea to fit its content so a multi-line todo is fully visible
 * while editing instead of scrolling inside a fixed-height box.
 */
export function autosize(node: HTMLTextAreaElement) {
	function resize() {
		// Reset first: without this the height only ever ratchets upward, since
		// scrollHeight can't shrink below the height already applied.
		node.style.height = 'auto';
		node.style.height = `${node.scrollHeight}px`;
	}

	resize();
	node.addEventListener('input', resize);

	return {
		destroy() {
			node.removeEventListener('input', resize);
		}
	};
}
