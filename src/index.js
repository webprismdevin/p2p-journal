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

var gun = Gun(['https://p2p-journal-webprism.herokuapp.com/gun', 'http://localhost:8765/gun', 'http://dev.webprism.co:8765/gun']);
var user = gun.user().recall({ sessionStorage: true });

const editor = new EditorJS({
    holderId: 'say',
    placeholder: "What's on your mind?",
    tools: {
        underline: {
            class: Underline,
            shortcut: 'CMD+U',
            inlineToolbar: true
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
            inlineToolbar: true
        }
    },
    autofocus: true,
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
        user.get('said').set(JSON.stringify(outputData));
        Toastify({
            text: 'Your post has been saved!',
            duration: 2500,
            gravity: "top",
            position: "right"
        }).showToast();
        editor.clear();
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

const renderPost = (data, id) => {
    let postData = JSON.parse(data)
    editor.blocks.render(postData).then(() => {
        editor.readOnly.toggle();
        $('#speak').prop('disabled', true);
    }).catch((err) => console.log(err))
}

$(document).on('click', '.open-button', (e) => {
    let id = e.target.value;

    user.get('said').get(id).once(renderPost)
})

$('#new_post').on('click', () => {
    editor.readOnly.toggle(false)
    .then(() => {
        editor.blocks.clear();
        $('#speak').prop('disabled', false);
    })

})

const getFirstBlock = (data) => {
    if(data.blocks[0] === undefined){
        return "This entry is blank..."
    }
    
    return data.blocks[0].data.text
}


function UI(say, id) {
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('#entries');
    if (say) {
        let data = JSON.parse(say);

        $(li).addClass("pt-8 pb-8");
        $(li).html(`<div style="border-bottom: 2px solid black">
                        <div class="text-sm">${new Date(data.time).toLocaleDateString() + " " + new Date(data.time).toLocaleTimeString()}</div>
                        <div class="mt-4">${getFirstBlock(data)}</div>
                        <div class="mt-2 mb-2 flex justify-between w-full">
                            <button class="open-button" value="${id}">Open Entry</button>
                            <button class="delete-button bg-red-600 text-white" id="${id}">Delete</button>
                        </div>
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