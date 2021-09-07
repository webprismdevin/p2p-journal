var $ = require('jquery');
//editorjs bs
var EditorJS = require('@editorjs/editorjs');
var Underline = require('@editorjs/underline');
const Header = require('@editorjs/header');
const Paragraph = require('@editorjs/paragraph');
const NestedList = require('@editorjs/nested-list');
const Delimiter = require('@editorjs/delimiter');
const Undo = require('editorjs-undo');
const Marker = require('@editorjs/marker');
//other
var Toastify = require('toastify-js/src/toastify');
var Gun = require('gun/gun');
require('gun/sea');
require('gun/axe');

var gun = Gun(['https://p2p-journal-webprism.herokuapp.com/gun']);
var user = gun.user().recall({ sessionStorage: true });

function customParser(block){
    return `<custom-tag> ${block.data.text} </custom-tag>`;
}

const editor = new EditorJS({
    holderId: 'say',
    placeholder: 'Let`s write an awesome story!',
    tools: {
        underline: {
            class: Underline,
            shortcut: 'CMD+I'
        },
        header: Header,
        paragraph: {
            class: Paragraph,
            inlineToolbar: true,
        },
        list: {
            class: NestedList,
            inlineToolbar: true,
        },
        delimiter: Delimiter,
        Marker: {
            class: Marker,
            shortcut: 'CMD+SHIFT+M',
          }
    },
    onReady: () => {
        new Undo({ editor });
    }
});

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
        // console.log('Article data: ', outputData);
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


function UI(say, id) {
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('#entries');
    if (say) {
        let data = JSON.parse(say);
        $(li).addClass("p-8 shadow");
        $(li).html(`<div>
                        <div class="delete-button float-right" id="${id}">&times;</div>
                        <div>${new Date(data.time).toLocaleDateString()}</div>
                        <hr>
                        <div>${parseHTML(data)}</div>
                    </div>`);
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