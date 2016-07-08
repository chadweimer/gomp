
$(document).ready(function(){
    $('.button-collapse').sideNav();
    $('.modal-trigger').leanModal();
    $('#userMenuLarge').dropdown({
      belowOrigin: true, // Displays dropdown below the button
    }
  );
});

function initEditRecipeForm() {
    if ($('#edit-recipe-container').length == 0) {
        return
    }

    $('#new-tag').on('keypress', function(event) {
        if (event.keyCode == 13) {
            var tag = $(this).val();
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
            $('#new-tag').val('');
            $('#new-tag').focus();

            return false;
        }
    });
}

initEditRecipeForm();
