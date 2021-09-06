var $ = require('jquery');
var MediumEditor = require('medium-editor');

var Gun = require('gun/gun');
require('gun/sea');

var Toastify = require('toastify-js/src/toastify');

var editor = new MediumEditor('.editable',{
    delay: 0,
    buttonLabels: 'fontawesome',
    placeholder: {
        text: 'Type your text',
        hideOnClick: false
    }
});

var gun = Gun(['http://localhost:8765/gun']);
var user = gun.user().recall({ sessionStorage: true });

$('#said').hide();
$('#myjournal').hide();
$('#logout').hide();


$('#up').on('click', function (e) {
    e.preventDefault();
    user.create($('#alias').val(), $('#pass').val());
});

$('#logout').on('click', function (){
    user.leave();
});

$('#sign').on('click', function (e) {
    e.preventDefault();
    user.auth($('#alias').val(), $('#pass').val());
});

$('#speak').on('click', function (e) {
    e.preventDefault();
    if (!user.is) { return }
    user.get('said').set($('#say').val());
    $('#say').val('');

    Toastify({
        text: 'Your post has been saved!',
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
    }).showToast();
});

$('body').on('click', '.delete-button', function (e) {
    Toastify({
        text: 'Are you sure you want to delete this journal entry? Click this notification to confirm.',
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        duration: 5000,
        close: true,
        backgroundColor: 'red',
        onClick: () => {
            user.get('said').get(e.target.id).put(null);
        }
    }).showToast();
});

function UI(say, id) {
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('ul');
    if(say){
        $(li).addClass("p-8 shadow");
        $(li).html(`<div>
                        <div id="${id}" class="float-right delete-button cursor-pointer">&times;</div>
                        <div>${say}</div>
                    </div>`);
    } else {
        $(li).hide();
    }
};

gun.on('auth', function () {
    $('#sign').hide();
    $('#said').show();
    $('#myjournal').show();
    $('#logout').show();
    user.get('said').map().on(UI);
});