// this would likely be passed in from native code after fetching from server
var annotations = [];
// create an Annotator instance
var annotator = new Annotator({
  tagName : 'span',
  className : 'highlight',
  noteClassName : 'note',
  leadClassName : 'first',
  rootNode : document.body
});
// this will hook into selection changes and react appropriately
annotator.start();
// we probably want to save annotations outside of the library
var createAnnotation = function(note) {
  window.getSelection().empty();
  var annotation = annotator.getAnnotationFromSelection();
  if (note) {
    annotation.note = note;
  }
  annotations.push(annotation);
  annotator.clearAll();
  annotations.forEach(function(annotation) {
    annotator.highlightAnnotation(annotation);
  });
};
// some UI behavior
document.getElementById('create-annotation').addEventListener('click', function(e){
  createAnnotation();
});
document.getElementById('create-note').addEventListener('click', function(e){
  var note = prompt('Note?', '');
  if (note) {
    createAnnotation(note);
  }
});
document.body.addEventListener('click', function(e){
  if(e.target.classList.contains(annotator.options.noteClassName)) {
    window.alert(e.target.annotation.note);
  }
});