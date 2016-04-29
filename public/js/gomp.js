// Initialize collapse button
$('.button-collapse').sideNav();
// Initialize collapsible (uncomment the line below if you use the dropdown variation)
//$('.collapsible').collapsible();

$(document).ready(function(){
    $('.modal-trigger').leanModal();
});

$('#add-tag').click(function() {
    var tags = $('#new-tag').val().split(' ');
    tags.forEach(function(tag) {
        tag =tag.toLowerCase();
        var chip = $('<div class="chip"></div>');
        chip.append(
            tag,
            '<i class="material-icons">close</i>');
        var input = $('<input type="hidden" name="tags">');
        input.val(tag);
        chip.append(input);
        $('#tags').append(chip);
    });
    $('#new-tag').val('');
    $('#new-tag').focus();
});

