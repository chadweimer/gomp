// Initialize collapse button
$('.button-collapse').sideNav();
// Initialize collapsible (uncomment the line below if you use the dropdown variation)
//$('.collapsible').collapsible();

$(document).ready(function(){
    $('.modal-trigger').leanModal();
});

$('#add-ingredient').click(function() {
    var chip = $('<div class="chip"></div>');
    chip.append(
        $('#new-ingredient').val(),
        '<i class="material-icons">close</i>');
    var input = $('<input type="hidden" name="ingredients">');
    input.val($('#new-ingredient').val());
    chip.append(input);
    $('#ingredients').append(chip);
    $('#new-ingredient').val('');
    $('#new-ingredient').focus();
});

