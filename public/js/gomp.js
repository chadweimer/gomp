
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
        const inputHtml =
            '<div class="ingreditent-row col s12 l12 no-padding">' +
                '<p class="input-field col s2 m2 l2">' +
                    '<input name="ingredient-amount" pattern="^([0-9]+/[1-9][0-9]*)|([0-9]*(\.[0-9]+)?)$" required>' +
                '</p>' +
                '<p class="input-field col s4 m4 l2">' +
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
