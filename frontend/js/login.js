document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const btnLogin = document.getElementById("btnLogin");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("passwordToggle");

    if (passwordInput && passwordToggle) {
        const updatePasswordToggle = (isVisible) => {
            passwordInput.type = isVisible ? "text" : "password";
            passwordToggle.textContent = isVisible ? "Ocultar" : "Mostrar";
            passwordToggle.setAttribute("aria-label", isVisible ? "Ocultar contraseña" : "Mostrar contraseña");
            passwordToggle.setAttribute("aria-pressed", String(isVisible));
        };

        passwordToggle.addEventListener("click", (event) => {
            event.preventDefault();
            const isVisible = passwordInput.type === "text";
            updatePasswordToggle(!isVisible);
        });
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById("username").value.trim();
        const passwordInputValue = document.getElementById("password").value.trim();

        if (!usernameInput || !passwordInputValue) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, ingresa tu usuario y contraseña.',
                confirmButtonColor: '#111111'
            });
            return;
        }

        // Bloquear botón durante el envío
        btnLogin.disabled = true;
        btnLogin.innerText = "Autenticando...";

        // Formato para OAuth2 (FastAPI exige multipart/form-data o urlencoded)
        const formData = new URLSearchParams();
        formData.append("username", usernameInput);
        formData.append("password", passwordInputValue);

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error al iniciar sesión");
            }

            // Guardar Token y datos de usuario en localStorage
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("cnel_token", data.access_token);
            localStorage.setItem("cnel_user", JSON.stringify(data.user));

            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: `Sesión iniciada como ${data.user.rol}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Redireccionar al dashboard principal que está servido en la ruta raíz
                window.location.href = "/dashboard";
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: error.message,
                confirmButtonColor: '#111111'
            });
        } finally {
            btnLogin.disabled = false;
            btnLogin.innerText = "Ingresando...";
        }
    });
});