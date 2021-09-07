var $ = require('jquery');
var EditorJS = require('@editorjs/editorjs');
var Toastify = require('toastify-js/src/toastify');
var Gun = require('gun/gun');
require('gun/sea');

var gun = Gun(['http://localhost:8765/gun']);
var user = gun.user().recall({ sessionStorage: true });

const editor = new EditorJS('say');

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
    editor.save().then((outputData) => {
        console.log('Article data: ', outputData);
        user.get('said').set(JSON.stringify(outputData));
        Toastify({
            text: 'Your post has been saved!',
            duration: 2500,
            gravity: "top",
            position: "right"
        }).showToast();
    }).catch((error) => {
        console.log('Saving failed: ', error);
        Toastify({
            text: 'Your post could not be saved :(',
            duration: 2500,
            gravity: "top",
            position: "right",
            backgroundColor: "orange"
        }).showToast();
    });
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
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('#entries');
    if (say) {
        console.log(say)
        $(li).addClass("p-8 shadow");
        $(li).html(parseHTML(JSON.parse(say)));
    } else {
        $(li).hide();
    }
}

const parseHTML = (json) => {
    var html = '';
    
    json.blocks.forEach(function(block) {
        switch (block.type) {
            case 'header':
                html += `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
                break;
            case 'paragraph':
                html += `<p>${block.data.text}</p>`;
                break;
            case 'delimiter':
                html += '<hr />';
                break;
            case 'image':
                html += `<img class="img-fluid" src="${block.data.file.url}" title="${block.data.caption}" /><br /><em>${block.data.caption}</em>`;
                break;
            case 'list':
                html += '<ul>';
                block.data.items.forEach(function(li) {
                    html += `<li>${li}</li>`;
                });
                html += '</ul>';
                break;
            default:
                console.log('Unknown block type', block.type);
                console.log(block);
            break;
        }
    });

    return html;
}

gun.on('auth', function () {
    $('#sign').hide();
    $('#said').show();
    $('#myjournal').show();
    $('#logout').show();
    user.get('said').map().on(UI);
});