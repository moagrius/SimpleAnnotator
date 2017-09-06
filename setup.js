var annotations = [];
var annotator = new Annotator({
  tagName : 'span',
  className : 'highlight',
  noteClassName : 'note',
  leadClassName : 'first',
  rootNode : document.body
});
var selected = {};
var createAnnotation = function(note) {
  window.getSelection().empty();
  var annotation = annotator.getAnnotationFromSelection(selected);
  if (note) {
    annotation.note = note;
  }
  console.log(annotation);
  annotations.push(annotation);
  annotator.clearAll();
  annotations.forEach(function(annotation) {
    annotator.highlightAnnotation(annotation);
  });
};
document.addEventListener('selectionchange', function(e){

  var selection = window.getSelection();

  // check to make sure the start node is first in the dom, otherwise swap them
  // if start and end are the same node, just check offset,
  // otherwise we have to run through the DOM until we hit one
  var inExpectedOrder = selection.anchorNode == selection.focusNode
    ? selection.anchorOffset < selection.focusOffset
    : annotator.nodeIsBefore(selection.anchorNode, selection.focusNode);
  console.log('in expected order? ' + inExpectedOrder);
  if (inExpectedOrder) {
    selected.anchorNode = selection.anchorNode;
    selected.focusNode = selection.focusNode;
    selected.anchorOffset = selection.anchorOffset;
    selected.focusOffset = selection.focusOffset;
  } else {
    selected.anchorNode = selection.focusNode;
    selected.focusNode = selection.anchorNode;
    selected.anchorOffset = selection.focusOffset;
    selected.focusOffset = selection.anchorOffset;
  }

  console.log(selected);

});
document.getElementById('create-annotation').addEventListener('click', function(e){
  createAnnotation();
});
document.getElementById('create-note').addEventListener('click', function(e){
  var note = prompt("Note?", "");
  if (note) {
    createAnnotation(note);
  }
});
document.body.addEventListener('click', function(e){
  if(e.target.classList.contains(annotator.options.noteClassName)) {
    window.alert(e.target.annotation.note);
  }
});