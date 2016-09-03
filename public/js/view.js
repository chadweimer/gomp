function onAddImageSubmitted(self, e) {
    e.preventDefault();

    showBusy('Uploading image...');
    var imageFormData = new FormData(self);
    postRecipeImageAsync(recipeId, imageFormData).done(function () {
        loadMainImage();
        loadImages();
        Materialize.toast('Upload complete', 2000);
    }).always(function () {
        hideBusy();
    });
}

function onSetMainImageClicked(self, e) {
    e.preventDefault();

    showConfirmation(
        'Set Main Image?',
        'live_help',
        'Are you sure you want to make this the main image for the recipe?',
        function (ee) {
            ee.preventDefault();

            var imageId = parseInt($(self).data('image-id'), 10);
            putRecipeMainImageAsync(recipeId, imageId).done(function () {
                $('html, body').animate({scrollTop: 0});
                loadMainImage();
                Materialize.toast('Main image updated', 2000);
            });
        });
}

function onSetRatingClicked(self, e) {
    e.preventDefault();

    var rating = $(self).data('rating');
    putRecipeRatingAsync(recipeId, rating).done(function () {
        $('.star').removeClass('active');
        $(self).addClass('active');
        Materialize.toast('Rating updated', 2000);
    });
}
