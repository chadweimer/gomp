
$(document).ready(function(){
    $('#mobile-menu-button').sideNav();
    $('.modal-trigger').leanModal();
    $('.dropdown').dropdown();
});

function loadRecipeAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId,
        method: 'GET',
        dataType: 'json',
    });
}

function loadMainImageAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'GET',
        dataType: 'json',
    });
}

function setMainImageAsync(rootUrlPath, recipeId, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            id: imageId,
            recipeId: recipeId,
        }),
    });
}

function loadImagesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images',
        method: 'GET',
        dataType: 'json',
    });
}

function deleteImageAsync(rootUrlPath, recipeId, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images/' + imageId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function loadNotesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes',
        method: 'GET',
        dataType: 'json',
    });
}

function addNoteAsync(rootUrlPath, recipeId, text) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            recipeId: recipeId,
            text: text,
        }),
    });
}

function editNoteAsync(rootUrlPath, recipeId, noteId, text) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes/' + noteId,
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            id: noteId,
            recipeId: recipeId,
            text: text,
        }),
    });
}

function deleteNoteAsync(rootUrlPath, noteId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes/' + noteId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function editRatingAsync(rootUrlPath, recipeId, rating) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/rating',
        method: 'PUT',
        dataType: 'json',
        processData: false,
        data: rating,
    });
}