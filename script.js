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

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerHTML = '&#9776;'; // hamburger icon
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag);

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            textSpan.addEventListener('click', () => toggleTodo(todo.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.textContent = 'X';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            const rightContainer = document.createElement('div');
            rightContainer.className = 'right-container';
            rightContainer.appendChild(deleteBtn);

            li.appendChild(handle);
            li.appendChild(textSpan);
            li.appendChild(rightContainer);

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

    // --- Initial Load ---
    allRecommendations.forEach(rec => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm m-1';
        btn.textContent = rec.text;
        btn.onclick = () => addTodo(rec.text);
        recommendationsContainer.appendChild(btn);
    });
});
