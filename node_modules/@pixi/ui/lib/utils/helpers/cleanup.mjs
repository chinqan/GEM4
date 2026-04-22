function cleanup(element) {
  if (!element) return;
  if (element.parent) {
    element.parent.removeChild(element);
  }
  element.destroy();
}

export { cleanup };
//# sourceMappingURL=cleanup.mjs.map
