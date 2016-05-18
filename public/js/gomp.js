
$(document).ready(function(){
    $('.button-collapse').sideNav();
    $('.modal-trigger').leanModal();
});

function initCreateEditRecipeForm() {
    if ($('#create-recipe-container').length == 0 && $('#edit-recipe-container').length == 0) {
        return
    }

    $('#add-tag').click(function() {
        var tags = $('#new-tag').val().split(' ');
        tags.forEach(function(tag) {
            if (tag.length == 0) {
                return;
            }
            tag = tag.toLowerCase();
            var chipHtml =
                '<div class="chip">' +
                    tag +
                    '<i class="material-icons">close</i>' +
                    '<input type="hidden" name="tags" value="' + tag +'">'
                '</div>'
            $('#tags').append(chipHtml);
        });
        $('#new-tag').val('');
        $('#new-tag').focus();
    });
}

initCreateEditRecipeForm();
