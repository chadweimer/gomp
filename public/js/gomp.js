function showBusy(text) {
    $('#busy-message').text(text);
    $('#busy-dialog').openModal({
        dismissible: false
    });
}

function hideBusy() {
    $('#busy-dialog').closeModal();
}

function showConfirmation(title, icon, message, yesCallback) {
    $('#confirmation-title').text(title);
    $('#confirmation-image').text(icon);
    $('#confirmation-message').text(message);
    $('#confirmation-yes')[0].onclick = yesCallback;
    $('#confirmation-dialog').openModal();
}

const API_BASE_PATH = '/api/v1';

function getAsync(url, data = null) {
    return $.ajax({
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + jwtToken
        },
        contentType: 'application/json',
        dataType: 'json',
        data: data
    });
}

function putPostOrDeleteAsync(url, method, data) {
    if (method !== 'PUT' && method !== 'POST' && method !== 'DELETE') {
        throw 'Method must be either PUT, POST, or DELETE.';
    }

    return $.ajax({
        url: url,
        method: method,
        headers: {
            'Authorization': 'Bearer ' + jwtToken
        },
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: data
    });
}

function putAsync(url, data) {
    return putPostOrDeleteAsync(url, 'PUT', data);
}

function postAsync(url, data) {
    return putPostOrDeleteAsync(url, 'POST', data);
}

function deleteAsync(url) {
    return putPostOrDeleteAsync(url, 'DELETE', null);
}

function postAuthenticeAsync(username, password) {
    return postAsync(API_BASE_PATH + '/auth', JSON.stringify({
        username: username,
        password: password
    }));
}

function getRecipesAsync(searchFilter) {
    return getAsync(API_BASE_PATH + '/recipes', searchFilter);
}

function getRecipeAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId);
}

function postRecipeAsync(recipe) {
    return postAsync(API_BASE_PATH + '/recipes', JSON.stringify(recipe));
}

function putRecipeAsync(recipe) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipe.id, JSON.stringify(recipe));
}

function deleteRecipeAsync(recipeId) {
    return deleteAsync(API_BASE_PATH + '/recipes/' + recipeId);
}

function getRecipeMainImageAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId + '/image');
}

function putRecipeMainImageAsync(recipeId, imageId) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipeId + '/image', imageId);
}

function getRecipeImagesAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId + '/images');
}

function postRecipeImageAsync(recipeId, imageFormData) {
    return $.ajax({
        url: API_BASE_PATH + '/recipes/' + recipeId + '/images',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + jwtToken
        },
        enctype: 'multipart/form-data',
        contentType: false,
        dataType: 'text',
        processData: false,
        data: imageFormData
    });
}

function deleteImageAsync(imageId) {
    return deleteAsync( API_BASE_PATH + '/images/' + imageId);
}

function getRecipeNotesAsync(recipeId) {
    return getAsync( API_BASE_PATH + '/recipes/' + recipeId + '/notes');
}

function postNoteAsync(note) {
    return postAsync(API_BASE_PATH + '/notes', JSON.stringify(note));
}

function putNoteAsync(note) {
    return putAsync(API_BASE_PATH + '/notes/' + note.id, JSON.stringify(note));
}

function deleteNoteAsync(noteId) {
    return deleteAsync(API_BASE_PATH + '/notes/' + noteId);
}

function putRecipeRatingAsync(recipeId, rating) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipeId + '/rating', rating);
}

function getTagsAsync(tagsFilter) {
    return getAsync(API_BASE_PATH + '/tags', tagsFilter);
}
