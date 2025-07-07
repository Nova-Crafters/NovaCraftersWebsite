document.querySelectorAll('.faq-question').forEach(button => {
          button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const arrow = button.querySelector('.arrow');
      
            button.classList.toggle('active');
            answer.style.maxHeight = answer.style.maxHeight ? null : answer.scrollHeight + "px";
            arrow.classList.toggle('rotate');
          });
        });