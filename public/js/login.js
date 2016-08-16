$(document).ready(function () {
    $('.require-login').addClass('hide');
});

function onLoginClicked(self, e) {
    e.preventDefault();

    var username = $('#username').val();
    var password = $('#password').val();
    postAuthenticeAsync(username, password).done(function (responseStr) {
        var response = JSON.parse(responseStr);
        localStorage.setItem("jwtToken", response.token);
        window.location = '/';
    });
}