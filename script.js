document.addEventListener('DOMContentLoaded', () => {
    const teamNameInput = document.getElementById('team-name');
    const newItemInput = document.getElementById('new-item');
    const addItemForm = document.getElementById('add-item-form');
    const todoList = document.getElementById('todo-list');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const recommendationsContainer = document.getElementById('recommendations');

    const attractionRecommendations = [
        { id: 'rec-1', text: '혜성특급 타기' },
        { id: 'rec-2', text: '자이로드롭 도전!' },
        { id: 'rec-3', text: '후룸라이드 타고 시원하게' },
    ];

    const foodRecommendations = [
        { id: 'rec-4', text: '구슬 아이스크림 먹기' },
        { id: 'rec-5', text: '츄러스 사먹기' },
    ];

    const showRecommendations = [
        { id: 'rec-6', text: '가든 스테이지 공연 보기' },
        { id: 'rec-7', text: '로티스 어드벤처 퍼레이드 구경' },
    ];
    const allRecommendations = [...attractionRecommendations, ...foodRecommendations, ...showRecommendations];

    let todos = [];

    // --- Firebase Setup ---
    const firebaseConfig = {
        databaseURL: "https://ourlotteday-default-rtdb.asia-southeast1.firebasedatabase.app",
    };
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const dbRef = database.ref('/our-lotte-day');

    let currentTodoId = null;
    const photoUploadInput = document.getElementById('photo-upload');

    // --- Data Persistence ---
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            teamNameInput.value = data.teamName || '✨ 우리들의 신나는 모험 ✨';
            
            if (data.todos) {
                todos = Object.keys(data.todos).map(key => ({
                    id: key,
                    ...data.todos[key]
                })).sort((a, b) => a.order - b.order);
            } else {
                todos = [];
            }

        } else {
            // If no data, initialize with defaults
            dbRef.child('teamName').set('✨ 우리들의 신나는 모험 ✨');
            const todosRef = dbRef.child('todos');
            allRecommendations.forEach((rec, index) => {
                todosRef.push({ text: rec.text, completed: false, order: index });
            });
        }
        renderTodos();
    });

    const updateTeamName = (name) => {
        dbRef.child('teamName').set(name);
    };

    // --- Core Functions ---
    const renderTodos = () => {
        todoList.innerHTML = '';
        if (todos.length === 0) {
            const emptyMsg = document.createElement('li');
            emptyMsg.className = 'list-group-item text-center text-muted';
            emptyMsg.textContent = '모든 임무 완료! 🎉';
            todoList.appendChild(emptyMsg);
            return;
        }
        
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `list-group-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            const topRow = document.createElement('div');
            topRow.className = 'todo-top-row';

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerHTML = '&#9776;';
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag);

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('click', () => toggleTodo(todo.id));

            const rightContainer = document.createElement('div');
            rightContainer.className = 'right-container';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.textContent = 'X';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            if (todo.completed) {
                if (todo.imageUrl) {
                    // 이미지가 있을 경우: 교체 및 삭제 버튼
                    const replaceBtn = document.createElement('button');
                    replaceBtn.className = 'btn btn-sm btn-outline-success upload-btn me-1';
                    replaceBtn.textContent = '사진 교체';
                    replaceBtn.onclick = () => {
                        currentTodoId = todo.id;
                        photoUploadInput.click();
                    };
                    const deletePhotoBtn = document.createElement('button');
                    deletePhotoBtn.className = 'btn btn-sm btn-outline-danger upload-btn';
                    deletePhotoBtn.textContent = '사진 삭제';
                    deletePhotoBtn.onclick = () => deletePhoto(todo.id);
                    rightContainer.appendChild(replaceBtn);
                    rightContainer.appendChild(deletePhotoBtn);
                } else {
                    // 이미지가 없을 경우: 업로드 버튼
                    const uploadBtn = document.createElement('button');
                    uploadBtn.className = 'btn btn-sm btn-outline-primary upload-btn';
                    uploadBtn.textContent = '사진 올리기';
                    uploadBtn.onclick = () => {
                        currentTodoId = todo.id;
                        photoUploadInput.click();
                    };
                    rightContainer.appendChild(uploadBtn);
                }
            }

            rightContainer.appendChild(deleteBtn);

            topRow.appendChild(handle);
            topRow.appendChild(textSpan);
            topRow.appendChild(rightContainer);

            li.appendChild(topRow);

            if (todo.completed && todo.imageUrl) {
                const img = document.createElement('img');
                img.src = todo.imageUrl;
                img.className = 'todo-image';
                li.appendChild(img);
            }

            todoList.appendChild(li);
        });
        updateProgress();
    };

    let draggedItem = null;
    let isDragging = false;

    function startDrag(e) {
        isDragging = true;
        draggedItem = e.target.closest('li');
        draggedItem.classList.add('dragging');

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const afterElement = getDragAfterElement(todoList, y);

        if (afterElement == null) {
            todoList.appendChild(draggedItem);
        } else {
            todoList.insertBefore(draggedItem, afterElement);
        }
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }

        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);

        updateTodosOrder();
        draggedItem = null;
    }

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const updateTodosOrder = () => {
        const newOrderedIds = [...todoList.querySelectorAll('li')].map(li => li.dataset.id);
        if (newOrderedIds.length !== todos.length) return; // Avoid updates on empty or partial lists

        const newTodos = newOrderedIds.map((id, index) => {
            const todo = todos.find(t => t.id === id);
            return { ...todo, order: index };
        });
        todos = newTodos;

        const updates = {};
        todos.forEach(todo => {
            if(todo.id) {
                updates[`/our-lotte-day/todos/${todo.id}/order`] = todo.order;
            }
        });
        if (Object.keys(updates).length > 0) {
            database.ref().update(updates);
        }
    };

    const updateProgress = () => {
        const completedCount = todos.filter(todo => todo.completed).length;
        const totalCount = todos.length;
        const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        progressText.textContent = `달성률: ${Math.round(percentage)}% (${completedCount}/${totalCount})`;
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);

        if (percentage === 100 && totalCount > 0) {
            // You can add a congratulations message here if you want
        }
    };

    const addTodo = (text) => {
        if (text.trim() === '') return;
        const newTodo = { text: text.trim(), completed: false, order: todos.length };
        database.ref('/our-lotte-day/todos').push(newTodo);
    };

    const toggleTodo = (id) => {
        const todo = todos.find(t => t.id == id);
        if (todo) {
            database.ref(`/our-lotte-day/todos/${id}/completed`).set(!todo.completed);
        }
    };

    const deleteTodo = (id) => {
        database.ref(`/our-lotte-day/todos/${id}`).remove();
    };

    const deletePhoto = (id) => {
        if (confirm('정말로 사진을 삭제하시겠습니까?')) {
            database.ref(`/our-lotte-day/todos/${id}/imageUrl`).remove();
        }
    };

    const uploadPhoto = (file) => {
        if (!currentTodoId || !file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            database.ref(`/our-lotte-day/todos/${currentTodoId}/imageUrl`).set(imageUrl)
                .then(() => {
                    currentTodoId = null;
                })
                .catch(error => {
                    alert('데이터베이스에 사진을 저장하지 못했습니다: ' + error.message);
                    currentTodoId = null;
                });
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            alert("파일을 읽는 중 오류가 발생했습니다.");
            currentTodoId = null;
        };
        reader.readAsDataURL(file);
    };

    // --- Event Listeners ---
    addItemForm.addEventListener('submit', e => {
        e.preventDefault();
        addTodo(newItemInput.value);
        newItemInput.value = '';
    });

    let debounceTimeout;
    teamNameInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            updateTeamName(teamNameInput.value);
        }, 500);
    });

    photoUploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        uploadPhoto(file);
    });

    // --- Initial Load ---
    allRecommendations.forEach(rec => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm m-1';
        btn.textContent = rec.text;
        btn.onclick = () => addTodo(rec.text);
        recommendationsContainer.appendChild(btn);
    });
});
