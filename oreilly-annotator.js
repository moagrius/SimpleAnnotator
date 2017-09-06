var Annotator = function(options) {
  this.options = options;
};

Annotator.IS_ONLY_WHITESPACE_REGEX = /^\s*$/;
Annotator.XPATH_DELIMITER = '/';
Annotator.XPATH_INDEX_OPEN = '[';
Annotator.XPATH_INDEX_CLOSE = ']';
Annotator.PROHIBITED_PARENT_TAGS = ['ul', 'ol', 'option', 'select', 'table', 'tbody', 'thead', 'tr'];

Annotator.prototype = {

  /**
   * tagName : tag name of element that a highlight wrapper will use
   * className : class name the highlight wrapping element will use
   * noteClassName : class name given to the wrapping element if there's a note
   * leadClassName : class name given to the first element in a series representing one annotation
   * rootNode : the top-most node xpath's should refer to
   */
  options : null,

  highlightNode: function(node) {
    if (!this.shouldHighlightNode(node)) {
     return null;
    }
    var highlighted = document.createElement(this.options.tagName);
    highlighted.appendChild(document.createTextNode(node.nodeValue));
    highlighted.classList.add(this.options.className);
    node.parentNode.replaceChild(highlighted, node);
    return highlighted;
  },

  shouldHighlightNode: function(node) {
    return (node != null)
     && (node.nodeType == Node.TEXT_NODE)
     && (node.parentNode != null)
     && (Annotator.PROHIBITED_PARENT_TAGS.indexOf(node.parentNode.nodeName) == -1)
     && !Annotator.IS_ONLY_WHITESPACE_REGEX.test(node.wholeText + node.nodeValue);
  },
  
  clearHighlight : function(element) {
    var textNode = document.createTextNode(element.textContent);
    element.parentNode.replaceChild(textNode, element);
  },
  
  clearAll : function() {
    var highlights = this.options.rootNode.getElementsByClassName(this.options.className);
    Array.from(highlights).forEach(this.clearHighlight.bind(this));
  },

  highlightAnnotation: function(annotation) {

    var startElement = this.findElementFromXpath(annotation.start);
    var endElement = this.findElementFromXpath(annotation.end);

    var startNodeAndOffset = this.getNodeFromOffset(startElement, annotation.startOffset);
    var startNode = startNodeAndOffset.node.splitText(startNodeAndOffset.offset);

    var endNodeAndOffset = this.getNodeFromOffset(endElement, annotation.endOffset);
    var endNode = endNodeAndOffset.node.splitText(endNodeAndOffset.offset).previousSibling;

    var nodesBetween = this.getTextNodesBetween(startNode, endNode);
    var dotted = false;  // only show the dot on the first of a series

    nodesBetween.forEach(function(node){
      var highlighted = this.highlightNode(node);
      if (highlighted == null) {
        return;
      }
      if (annotation.note) {
        highlighted.classList.add(this.options.noteClassName);
        if (!dotted) {
          highlighted.classList.add(this.options.leadClassName);
          dotted = true;
        }
      }
      highlighted.annotation = annotation;
    }, this);
  },

  getTextNodesBetween : function(start, end) {
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
      var current = walker.currentNode;
      var size = current.nodeValue.length;
      count += size;
      if (count >= offset) {
        return {
          node : current,
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
    if (element.nodeType != Node.ELEMENT_NODE) {
      element = element.parentElement;
    }
    console.log(element);
    var tags = [];
    while (element != null && element != this.options.rootNode) {
      var index = this.getLikeSiblingIndex(element);
      var component = element.nodeName + Annotator.XPATH_INDEX_OPEN + index + Annotator.XPATH_INDEX_CLOSE;  // div[1]
      tags.unshift(component);
      element = element.parentElement;
    }
    return tags.join(Annotator.XPATH_DELIMITER);
  },

  getOffsetToNode: function(node, parent) {
    if (arguments.length == 1) {
      parent = node.parentElement;
    }
    var offset = 0;
    var walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var current = walker.currentNode;
      if (current == node || current.parentElement == node) {
        break;
      }
      offset += current.nodeValue.length;
    }
    return offset;
  },

  /**
  * get the first ancestor of the node that has the highlight class, or null
  */
  getHighlightAncestor: function(node) {
    while (node != null && node != this.options.rootNode) {
      if (node.nodeType == Node.ELEMENT_NODE && node.classList.contains(this.options.className)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  },

  /**
   * if the node is not in a highlight, return it
   * otherwise return the first parent that is not a highlight
   */
  getNormalizedParent: function(node) {
    var highlight = this.getHighlightAncestor(node);
    if (highlight == null) {
      return node.nodeType == Node.ELEMENT_NODE ? node : node.parentElement;
    }
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
    var endElement = this.getNormalizedParent(selection.focusNode);
    var startOffset = selection.anchorOffset;
    var endOffset = selection.focusOffset;
    if (startElement != selection.anchorNode) {
      startOffset += this.getOffsetToNode(selection.anchorNode, startElement);
    }
    if (endElement != selection.focusNode) {
      endOffset += this.getOffsetToNode(selection.focusNode, endElement);
    }
    return {
      start: this.getXPath(startElement),
      startOffset: startOffset,
      end: this.getXPath(endElement),
      endOffset: endOffset
    };
  }

};