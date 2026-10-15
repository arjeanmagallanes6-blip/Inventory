document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const alertBox = document.getElementById('alertBox');
    const submitBtn = document.getElementById('submitBtn');
    const formData = new FormData(this);

    submitBtn.disabled = true;
    submitBtn.innerText = "Signing in...";
    alertBox.classList.add('d-none');

    try {
        const response = await fetch('../php/login_process.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            alertBox.className = "alert alert-success py-2";
            alertBox.innerText = data.message || "Success! Redirecting...";
            alertBox.classList.remove('d-none');
            
            setTimeout(() => {
                window.location.href = '../html/dashboard.html';
            }, 1000);
        } else {
            alertBox.className = "alert alert-danger py-2";
            alertBox.innerText = data.message;
            alertBox.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.innerText = "Sign In";
        }
    } catch (error) {
        console.error("Login submission error:", error);
        alertBox.className = "alert alert-danger py-2";
        alertBox.innerText = "Connection error. Please try again.";
        alertBox.classList.remove('d-none');
        submitBtn.disabled = false;
        submitBtn.innerText = "Sign In";
    }
});