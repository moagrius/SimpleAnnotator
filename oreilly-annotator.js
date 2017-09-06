var Annotator = function(options) {
  this.options = options;
};

Annotator.HAS_NON_WHITE_REGEX = /\S/g;
Annotator.XPATH_DELIMITER = '/';
Annotator.XPATH_INDEX_OPEN = '[';
Annotator.XPATH_INDEX_CLOSE = ']';
Annotator.PROHIBITED_PARENT_TAGS = ['ul', 'ol', 'option', 'select', 'table', 'tbody', 'thead', 'tr'];

Annotator.prototype = {

  // tagName : tag name of element that a highlight wrapper will use
  // className : class name the highlight wrapping element will use
  // noteClassName : class name given to the wrapping element if there's a note
  // leadClassName : class name given to the first element in a series representing one annotation
  // rootNode : the top-most node xpath's should refer to
  options : null,

  highlightNode: function(node) {
    if (this.shouldHighlightNode(node)) {
      console.log('should highlight this node, should not return null');
      var highlighted = document.createElement(this.options.tagName);
      console.log('highlighted: ' + highlighted.innerHTML);
      highlighted.appendChild(document.createTextNode(node.nodeValue));
      highlighted.classList.add(this.options.className);
      node.parentNode.replaceChild(highlighted, node);
      console.log('highlighted: ' + highlighted.innerHTML);
      console.log('about to return a valid element...');
      return highlighted;
    }
    // debug block
    console.log('made it here, what failed?');
    console.log('node? ' + node);
    console.log('node.parentNode? ' + node.parentNode);
    console.log('nodeType? ' + node.nodeType);
    console.log('node is not null? ' + (node != null));
    console.log('has a parent? ' + (node.parentNode != null));
    console.log('is a text node? ' + (node.nodeType == Node.TEXT_NODE));
    console.log('valid container? ' + (Annotator.PROHIBITED_PARENT_TAGS.indexOf(node.parentNode.nodeName) == -1));
    console.log('has non white? ' + Annotator.HAS_NON_WHITE_REGEX.test(node.wholeText + node.nodeValue));

    return null;
  },

  // this is failing...  write out with logs
  /*
  shouldHighlightNode: function(node) {
    return (node != null)
     && (node.parentNode != null)
     && (node.nodeType == Node.TEXT_NODE)
     && (Annotator.PROHIBITED_PARENT_TAGS.indexOf(node.parentNode.nodeName) == -1)
     && Annotator.HAS_NON_WHITE_REGEX.test(node.wholeText + node.nodeValue);
  },
  */

  shouldHighlightNode: function(node) {
    if (node == null) {
      console.log('node is null');
      return false;
    }
    if (node.parentNode == null) {
      console.log('parent is null');
      return false;
    }
    if (node.nodeType != Node.TEXT_NODE) {
      console.log('node is not a text node');
      return false;
    }
    if (Annotator.PROHIBITED_PARENT_TAGS.indexOf(node.parentNode.nodeName) != -1) {
      console.log('is in invalid container');
      return false;
    }
    if (!Annotator.HAS_NON_WHITE_REGEX.test(node.wholeText + node.nodeValue)) {
      console.log('has only whitespace');
      return false;
    }
    return true;
  },
  
  clearHighlight : function(element) {
    var textNode = document.createTextNode(element.textContent);
    element.parentNode.replaceChild(textNode, element);
  },
  
  clearAll : function() {
    var highlights = this.options.rootNode.getElementsByClassName(this.options.className);
    var clear = this.clearHighlight.bind(this);
    Array.from(highlights).forEach(clear);
  },

  highlightAnnotation: function(annotation) {

    var startElement = this.findElementFromXpath(annotation.start);
    var endElement = this.findElementFromXpath(annotation.end);

    console.log('startElement: ' + startElement.nodeName + ', ' + startElement.nodeValue);

    // TODO: makes sure these are TEXT nodes
    var startNodeAndOffset = this.getNodeFromOffset(startElement, annotation.startOffset);
    var startNode = startNodeAndOffset.node.splitText(startNodeAndOffset.offset);

    console.log('startNode: ' + startNode.nodeName + ', ' + startNode.nodeValue);

    var endNodeAndOffset = this.getNodeFromOffset(endElement, annotation.endOffset);
    var endNode = endNodeAndOffset.node.splitText(endNodeAndOffset.offset).previousSibling;

    console.log('nodes');
    console.log('startNode: ' + startNode.nodeName + ', ' + startNode.nodeValue);
    console.log('endNode: ' + endNode.nodeName + ', ' + endNode.nodeValue);
    var nodesBetween = this.getTextNodesBetween(startNode, endNode);
    var dotted = false;  // only show the dot on the first of a series
    console.log('about to iterate and wrap nodes between start and end');
    for(var i = 0; i < nodesBetween.length; i++) {
      var node = nodesBetween[i];
      console.log('highlighting nodes between, iteration ' + i + ', ' + node.nodeValue);
      var highlighted = this.highlightNode(node);
      if (highlighted == null) {
        console.log('highlighted is null, continuing');
        continue;
      }
      if (annotation.note) {
        highlighted.classList.add(this.options.noteClassName);
        if (!dotted) {
          highlighted.classList.add(this.options.leadClassName);
          dotted = true;
        }
      }
      highlighted.annotation = annotation;
    };
  },

  getTextNodesBetween : function(start, end) {
    console.log('getTextNodesBetween');
    console.log('start: ' + start.nodeValue);
    console.log('end:' + end.nodeValue);
    var collection = [];
    var walker = document.createTreeWalker(this.options.rootNode, NodeFilter.SHOW_TEXT);
    var collect = false;
    while (walker.nextNode()) {
      var current = walker.currentNode;
      if (!collect && current == start) {
        collect = true;
      }
      if (collect) {
        if (current.nodeValue.length > 0) {
          collection.push(current);
        }
        if (current == end) {
          break;
        }
      }
    }
    return collection;
  },

  nodeIsBefore : function(a, b) {
    var walker = document.createTreeWalker(this.options.rootNode);
    while (walker.nextNode()) {
      var current = walker.currentNode;
      // if we hit "a" first, it's before "b"
      if (current == a) {
        return true;
      }
      // if we haven't returned yet and hit "b", then "a" is not before it
      if (current == b) {
        return false;
      }
    }
    return false;
  },

  getNodeFromOffset: function(element, offset) {
    var count = 0;
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      console.log('walking: ' + walker.currentNode.nodeValue);
      var size = walker.currentNode.nodeValue.length;
      count += size;
      if (count >= offset) {
        return {
          node : walker.currentNode,
          offset : size - (count - offset)
        };
      }
    }
    return null;
  },

  findElementFromXpath: function(xpath) {
    var query = document.evaluate(xpath, this.options.rootNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (query != null) {
      return query.singleNodeValue;
    }
    return null;
  },

  getLikeSiblingIndex: function(element) {
    var position = 1;
    var name = element.nodeName;
    element = element.previousElementSibling;
    while (element != null) {
      if (name == element.nodeName) {
        position++;
      }
      element = element.previousElementSibling;
    }
    return position;
  },

  getXPath: function(element) {
    console.log('getXPath');
    if (element.nodeType != Node.ELEMENT_NODE) {
      element = element.parentElement;
    }
    console.log(element);
    var tags = [];
    while (element != null && element != this.options.rootNode) {
      var path = element.nodeName;
      console.log('counting previous siblings of ' + path);
      var index = this.getLikeSiblingIndex(element);
      var component = path + Annotator.XPATH_INDEX_OPEN + index + Annotator.XPATH_INDEX_CLOSE;  // div[1]
      tags.unshift(component);
      console.log('moving up a level');
      element = element.parentElement;
    }
    return tags.join(Annotator.XPATH_DELIMITER);
  },

  getOffsetToNode: function(node, parent) {
    if (arguments.length == 1) {
      parent = node.parentElement;
    }
    console.log('getOffsetToNode');
    console.log('node: ' + node.nodeValue);
    var offset = 0;
    var walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      console.log('current node: ' + walker.currentNode.nodeName, walker.currentNode.nodeValue);
      if (walker.currentNode == node || walker.currentNode.parentElement == node) {
        break;
      }
      offset += walker.currentNode.nodeValue.length;
    }
    return offset;
  },

  /**
  * get the first ancestor of the node that has the highlight class, or null
  */
  getHighlightAncestor: function(node) {
    console.log('getHighlightAncestor');
    while (node && node != this.options.rootNode) {
      if (node.nodeType == Node.ELEMENT_NODE && node.classList.contains(this.options.className)) {
        return node;
      }
      console.log('getHighlightAncestor, node is not root, move up parent');
      node = node.parentElement;
    }
    return null;
  },

  // if the node is not in a highlight, return it
  // otherwise return the first parent that is not a highlight
  getNormalizedParent: function(node) {
    console.log('getNormalizedParent');
    var highlight = this.getHighlightAncestor(node);
    if (highlight == null) {
      console.log('no highlight parent, return node');
      return node.nodeType == Node.ELEMENT_NODE ? node : node.parentElement;
    }
    console.log('found a highlight ancestor for ' + node.nodeName);
    return this.getNormalizedParent(highlight.parentElement);
  },


  /**
  * Selection gives us anchor/focusNode and anchor/focusOffset,
  * which are really nice indicators of where the selection is.  Unfortunately,
  * these need to persist, so we use the parent element of each node as xpath,
  * and have to add the number of characters to the offset that leads to the node
  */
  getAnnotationFromSelection: function(selection) {
    var startElement = this.getNormalizedParent(selection.anchorNode);
    console.log('start element: ' + startElement.nodeName);
    console.log('start node: ' + selection.anchorNode.nodeName);
    console.log('find end element');
    var endElement = this.getNormalizedParent(selection.focusNode);
    console.log('end element: ' + endElement.nodeName);
    console.log('end node: ' + selection.focusNode.nodeName);
    var startOffset = selection.anchorOffset;
    var endOffset = selection.focusOffset;
    if (startElement != selection.anchorNode) {
      console.log('start element different from anchor node, add offset');
      var offset = this.getOffsetToNode(selection.anchorNode, startElement);
      startOffset += offset;
      console.log('adding ' + offset + ' for total ' + startOffset);
    }
    if (endElement != selection.focusNode) {
      console.log('end element different from focus node, add offset');
      var offset = this.getOffsetToNode(selection.focusNode, endElement);
      endOffset += offset;
      console.log('adding ' + offset + ' for total ' + endOffset);
    }
    return {
      start: this.getXPath(startElement),
      startOffset: startOffset,
      end: this.getXPath(endElement),
      endOffset: endOffset
    };
  }

};