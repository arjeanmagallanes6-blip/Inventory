document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const alertBox = document.getElementById('alertBox');
    const submitBtn = document.getElementById('submitBtn');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // Front-end validation for password match
    if (password !== confirmPassword) {
        alertBox.className = "alert alert-danger py-2";
        alertBox.innerText = "Passwords do not match.";
        alertBox.classList.remove('d-none');
        return;
    }

    const formData = new FormData(this);

    submitBtn.disabled = true;
    submitBtn.innerText = "Creating Account...";
    alertBox.classList.add('d-none');

    try {
        const response = await fetch('../php/register_process.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            alertBox.className = "alert alert-success py-2";
            alertBox.innerText = data.message;
            alertBox.classList.remove('d-none');
            
            this.reset();
            setTimeout(() => {
                window.location.href = '../html/login.html';
            }, 1500);
        } else {
            alertBox.className = "alert alert-danger py-2";
            alertBox.innerText = data.message;
            alertBox.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.innerText = "Register Account";
        }
    } catch (error) {
        alertBox.className = "alert alert-danger py-2";
        alertBox.innerText = "Connection error. Please try again.";
        alertBox.classList.remove('d-none');
        submitBtn.disabled = false;
        submitBtn.innerText = "Register Account";
    }
});