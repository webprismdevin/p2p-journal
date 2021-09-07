var $ = require('jquery');
var FroalaEditor = require('froala-editor');
// require('../node_modules/froala-editor/js/plugins/paragraph_format.min.js');
// require('../node_modules/froala-editor/js/plugins/paragraph_style.min.js');
var Toastify = require('toastify-js/src/toastify');
var Gun = require('gun/gun');
require('gun/sea');

var editor = new FroalaEditor('.editable', {
    toolbarButtons: ['bold', 'italic', 'underline', 'undo', 'redo']
});

var gun = Gun(['http://localhost:8765/gun']);
var user = gun.user().recall({ sessionStorage: true });

$('#said').hide();
$('#myjournal').hide();
$('#logout').hide();


$('#up').on('click', function (e) {
    user.create($('#alias').val(), $('#pass').val());
});

$('#logout').on('click', function (e) {
    user.leave();
    $('#said').hide();
    $('#myjournal').hide();
    $('#logout').hide();
    $('#sign').show();
});

$('#sign').on('submit', function (e) {
    e.preventDefault();
    user.auth($('#alias').val(), $('#pass').val());
});


$('#said').on('submit', function(e){
    e.preventDefault();
    if(!user.is){ return; }
    user.get('said').set(editor.html.get());
    Toastify({
        text: 'Your post has been saved!',
        duration: 2500,
        gravity: "top",
        position: "right"
    }).showToast();
  });

$(document).on('click', '.delete-button', function (e) {
    e.preventDefault();
    let deleteToast = Toastify({
        text: 'Are you sure you want to delete this journal entry? Click this notification to confirm.',
        gravity: "top",
        position: "right",
        duration: -1,
        backgroundColor: 'red',
        close: true,
        onClick: function(){
            user.get('said').get(e.target.id).put(null);
            if(deleteToast){
                deleteToast.hideToast();
            }
        }
    })
    
    deleteToast.showToast();
});

function UI(say, id) {
    console.log('loading')
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('#entries');
    if (say) {
        $(li).addClass("p-8 shadow");
        $(li).html(`<div><div id="${id}" class="float-right delete-button cursor-pointer">&times;</div><div>${say}</div></div>`);
    } else {
        $(li).hide();
    }
}

gun.on('auth', function () {
    $('#sign').hide();
    $('#said').show();
    $('#myjournal').show();
    $('#logout').show();
    user.get('said').map().on(UI);
});