
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

    function addIngredientRow() {
        // Create the static part of the new entry
        const inputHtml =
            '<div class="ingreditent-row col s12 l12 no-padding">' +
                '<p class="input-field col s2 m2 l2">' +
                    '<input name="ingredient-amount" pattern="^([0-9]+/[1-9][0-9]*)|([0-9]*(\.[0-9]+)?)$" required>' +
                '</p>' +
                '<p class="input-field col s4 m4 l2">' +
                    '<select name="ingredient-unit" required>' +
                        '<option value="" selected disabled>(Choose)</option>' +
                    '</select>' +
                '</p>' +
                '<p class="input-field col s4 m5 l7">' +
                    '<input name="ingredient-name" required>' +
                '</p>' +
                '<span class="input-field col s2 m1 l1 right-align">' +
                    '<a class="btn-floating red">' +
                        '<i class="material-icons">close</i>'
                    '</a>' +
                '</span>' +
            '</div>';
        var newIngredientRow = $(inputHtml);
        var select = newIngredientRow.find('select');
        var removeButton = newIngredientRow.find('a.btn-floating');

        // Add the unit options from the database, grouped by category
        var currentOptGroup = null;
        for (i = 0; i < units.length; i++) {
            if (currentOptGroup == null || currentOptGroup.attr('label') != units[i].category) {
                currentOptGroup = $('<optgroup></optgroup>');
                currentOptGroup.attr('label', units[i].category);
                select.append(currentOptGroup);
            }
            currentOptGroup.append(
                '<option value="' + units[i].id + '">' + units[i].shortName + '</option>');
        }

        // Enable the remove button to remove the entire entry
        removeButton.click(function() {
            $(this).parent().parent().remove();
        });

        // Add the new entry to the page
        $('#ingredients-placeholder').append(newIngredientRow);
        select.material_select();
    }

    $('#add-ingredient-button').click(addIngredientRow);

    $(document).ready(function() {
        if ($('.ingreditent-row').length == 0) {
            addIngredientRow();
        }
    });
}

initCreateEditRecipeForm();
