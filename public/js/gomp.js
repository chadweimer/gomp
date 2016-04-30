
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

    function addIngredientRow() {
        const inputHtml =
            '<div class="ingreditent-row col s12 l12 no-padding">' +
                '<p class="input-field col s6 l2">' +
                    '<input id="ingredient-quantity" name="ingredient-quantity" pattern="^([0-9]+/[1-9][0-9]*)|([0-9]*(\.[0-9]+)?)$" required>' +
                '</p>' +
                '<p class="input-field col s6 l2">' +
                    '<select name="ingredient-unit" required>' +
                        '<option value="" selected disabled>(Choose)</option>' +
                        '<option value="item">Item</option>' +
                        '<optgroup label="Volume">' +
                            '<option value="tsp">Teaspoon</option>' +
                            '<option value="tbsp">Tablespoon</option>' +
                            '<option value="cup">Cup</option>' +
                            '<option value="fl oz">Fluid Ounce</option>' +
                        '</optgroup>' +
                        '<optgroup label="Weight">' +
                            '<option value="lb">Pound</option>' +
                            '<option value="oz">Ounce</option>' +
                        '</optgroup>' +
                    '</select>' +
                '</p>' +
                '<p class="input-field col s11 l7">' +
                    '<input name="ingredient-name" required>' +
                '</p>' +
                '<span class="input-field col s1 l1 right-align">' +
                    '<a class="btn-floating red">' +
                        '<i class="material-icons">close</i>'
                    '</a>' +
                '</span>' +
            '</div>';
        var newIngredientRow = $(inputHtml);
        $('#ingredients-placeholder').append(newIngredientRow);
        newIngredientRow.find('select').material_select();
        newIngredientRow.find('a.btn-floating').click(function() {
            $(this).parent().parent().remove();
        });
    }

    $('#add-ingredient-button').click(addIngredientRow);

    $(document).ready(function() {
        if ($('.ingreditent-row').length == 0) {
            addIngredientRow();
        }
    });
}

initCreateEditRecipeForm();
