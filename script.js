let topics = {}, selectedTopics = [], selected = [], answers = {}, reviewFlags = {}, currentIndex = 0;
let timeLeft, timerId;

document.getElementById('folders').addEventListener('change', (event) => {
  let allFiles = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
  topics = {};
  allFiles.forEach(f => {
    let folder = f.webkitRelativePath.split('/')[1]; // subfolder name
    if (!topics[folder]) topics[folder] = [];
    topics[folder].push(f);
  });

  // Show topic checklist with per-topic question input
  let setupDiv = document.getElementById('setup');
  let topicList = document.createElement('div');
  topicList.innerHTML = "<h3>Select Topics and Questions:</h3>";
  Object.keys(topics).forEach(name => {
    let row = document.createElement('div');
    row.className = "topicRow";

    let cb = document.createElement('input');
    cb.type = "checkbox";
    cb.value = name;

    let label = document.createElement('label');
    label.textContent = name;

    let qInput = document.createElement('input');
    qInput.type = "number";
    qInput.min = 1;
    qInput.value = document.getElementById('numQuestions').value; // default
    qInput.className = "topicQInput";

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(qInput);
    topicList.appendChild(row);
  });
  setupDiv.appendChild(topicList);
});

document.getElementById('startBtn').addEventListener('click', () => {
  let examTime = parseInt(document.getElementById('examTime').value) * 60;

  // Collect selected topics and their question counts
  selectedTopics = [];
  document.querySelectorAll('#setup div input[type=checkbox]:checked').forEach(cb => {
    let topicName = cb.value;
    let qInput = cb.parentElement.querySelector('.topicQInput');
    let numQ = parseInt(qInput.value);
    selectedTopics.push({ name: topicName, numQ: numQ });
  });

  if (selectedTopics.length === 0) {
    alert("Please select at least one topic.");
    return;
  }

  // Randomly select questions per chosen topic
  selected = [];
  selectedTopics.forEach(t => {
    let files = topics[t.name];
    for (let i = 0; i < t.numQ; i++) {
      let rand = Math.floor(Math.random() * files.length);
      selected.push({ file: files[rand], topic: t.name });
    }
  });

  timeLeft = examTime;
  startTimer();
  document.getElementById('setup').style.display = "none";
  document.getElementById('exam').style.display = "block";
  buildNav();
  showQuestion(0);
});

function startTimer() {
  timerId = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerId);
      submitTest();
    }
  }, 1000);
}

function formatTime(sec) {
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = sec % 60;
  return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function buildNav() {
  let nav = document.getElementById('sidebar');
  nav.innerHTML = "<h3>Questions</h3>";
  selected.forEach((_, i) => {
    let btn = document.createElement('button');
    btn.textContent = i+1;
    btn.className = "unvisited";
    btn.onclick = () => showQuestion(i);
    nav.appendChild(btn);
  });
}

function updateNav() {
  let navBtns = document.querySelectorAll('#sidebar button');
  navBtns.forEach((btn, i) => {
    if (answers[i]) {
      btn.className = "answered";
    } else if (reviewFlags[i]) {
      btn.className = "review";
    } else {
      btn.className = "unvisited";
    }
  });
}

function showQuestion(index) {
  currentIndex = index;
  let qArea = document.getElementById('questionArea');
  qArea.innerHTML = "";
  let qDiv = document.createElement('div');
  qDiv.className = "question";

  let title = document.createElement('h3');
  title.textContent = `Topic: ${selected[index].topic}`;
  qDiv.appendChild(title);

  let img = document.createElement('img');
  img.src = URL.createObjectURL(selected[index].file);
  img.width = 400;
  qDiv.appendChild(img);

  let optionsDiv = document.createElement('div');
  optionsDiv.className = "options";
  ["A","B","C","D"].forEach(opt => {
    let label = document.createElement('label');
    let input = document.createElement('input');
    input.type = "radio";
    input.name = "q" + index;
    input.value = opt;
    if (answers[index] === opt) input.checked = true;
    input.onchange = () => { answers[index] = opt; updateNav(); };
    label.appendChild(input);
    label.appendChild(document.createTextNode(" Option " + opt));
    optionsDiv.appendChild(label);
  });
  qDiv.appendChild(optionsDiv);

  let reviewBtn = document.createElement('button');
  reviewBtn.textContent = reviewFlags[index] ? "Unmark Review" : "Mark for Review";
  reviewBtn.onclick = () => {
    reviewFlags[index] = !reviewFlags[index];
    updateNav();
    showQuestion(index);
  };
  qDiv.appendChild(reviewBtn);

  qArea.appendChild(qDiv);
  updateNav();
}

document.getElementById('prevBtn').onclick = () => {
  if (currentIndex > 0) showQuestion(currentIndex - 1);
};
document.getElementById('nextBtn').onclick = () => {
  if (currentIndex < selected.length - 1) showQuestion(currentIndex + 1);
};

document.getElementById('submitBtn').onclick = submitTest;

function submitTest() {
  clearInterval(timerId);
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();

  selected.forEach((q, i) => {
    let imgData = URL.createObjectURL(q.file);
    let img = new Image();
    img.src = imgData;
    img.onload = function() {
      let pageWidth = doc.internal.pageSize.getWidth();
      let imgWidth = pageWidth - 20;
      let imgHeight = (img.height / img.width) * imgWidth;

      doc.text(`Question ${i+1} (Topic: ${q.topic})`, 10, 20);
      doc.addImage(img, 'PNG', 10, 30, imgWidth, imgHeight);
      let yPos = 40 + imgHeight;
      doc.text(`Response: ${answers[i] || "Not Answered"}`, 10, yPos);

      if (i < selected.length - 1) {
        doc.addPage();
      }
      if (i === selected.length - 1) {
        doc.save("topicwise_mock_test_responses.pdf");
        document.getElementById('result').innerHTML = "<h2>Test Submitted! PDF downloaded with images and topics.</h2>";
      }
    };
  });
}

// --------------------
// Help modal logic
// --------------------
let helpModal = document.getElementById('helpModal');
let helpBtn = document.getElementById('helpBtn');
let closeHelp = document.getElementById('closeHelp');

helpBtn.onclick = () => {
  helpModal.style.display = "block";
};
closeHelp.onclick = () => {
  helpModal.style.display = "none";
};
window.onclick = (event) => {
  if (event.target == helpModal) {
    helpModal.style.display = "none";
  }
};
