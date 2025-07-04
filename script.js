const activity = [
  // Transport
  {
    name: "Car (Petrol) - per km",
    category: "transport",
    co2Value: 0.21,
    unit: "km",
  },
  {
    name: "Car (Diesel) - per km",
    category: "transport",
    co2Value: 0.17,
    unit: "km",
  },
  { name: "Bus - per km", category: "transport", co2Value: 0.08, unit: "km" },
  { name: "Train - per km", category: "transport", co2Value: 0.04, unit: "km" },
  {
    name: "Flight (Domestic) - per km",
    category: "transport",
    co2Value: 0.25,
    unit: "km",
  },
  {
    name: "Flight (International) - per km",
    category: "transport",
    co2Value: 0.15,
    unit: "km",
  },

  // Food
  { name: "Beef - per 100g", category: "food", co2Value: 6.0, unit: "100g" },
  { name: "Chicken - per 100g", category: "food", co2Value: 1.6, unit: "100g" },
  { name: "Fish - per 100g", category: "food", co2Value: 1.2, unit: "100g" },
  {
    name: "Vegetables - per 100g",
    category: "food",
    co2Value: 0.4,
    unit: "100g",
  },
  { name: "Dairy - per 100ml", category: "food", co2Value: 0.6, unit: "100ml" },
  { name: "Coffee - per cup", category: "food", co2Value: 0.05, unit: "cup" },

  // Energy
  {
    name: "Electricity - per kWh",
    category: "energy",
    co2Value: 0.4,
    unit: "kWh",
  },
  {
    name: "Natural Gas - per kWh",
    category: "energy",
    co2Value: 0.2,
    unit: "kWh",
  },
  {
    name: "Heating Oil - per liter",
    category: "energy",
    co2Value: 2.5,
    unit: "liter",
  },

  // Waste
  {
    name: "General Waste - per kg",
    category: "waste",
    co2Value: 0.5,
    unit: "kg",
  },
  { name: "Recycling - per kg", category: "waste", co2Value: 0.1, unit: "kg" },
];

const categories = ["transport", "food", "energy", "waste"];

const allActivitiesArr = [];

let selectedActivity = null;

function populateSelect() {
  const dropdown = document.getElementById("dropdown");
  const placeholder = document.createElement("option");

  placeholder.textContent = "Select an activity";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.hidden = true;

  dropdown.appendChild(placeholder);

  const groupedAct = activity.reduce((obj, item) => {
    if (!obj[item.category]) obj[item.category] = [];
    obj[item.category].push(item);
    return obj;
  }, {});

  for (const category in groupedAct) {
    const group = document.createElement("optgroup");
    group.label = category.charAt(0).toUpperCase() + category.slice(1);

    groupedAct[category].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      const co2Symbol = "CO\u2082";
      option.textContent = `${item.name} (${item.co2Value} kg ${co2Symbol}/${item.unit})`;
      group.appendChild(option);
    });
    dropdown.appendChild(group);
  }
}

function calculateTotal(quantity, co2Value, total) {
  if (selectedActivity && quantity.value) {
    const quantityValue = parseFloat(quantity.value);
    const totalC02 = (quantityValue * co2Value).toFixed(2);
    total.value = `${totalC02} kg CO2`;
  } else {
    total.innerHTML = `${selectedActivity.co2Value} kg CO2`;
  }
}

function selectActivity() {
  const selectedOption = document.getElementById("dropdown");
  const activityDetails = document.getElementById("activityDetails");
  const categoriesSelect = document.getElementById("Categories");

  selectedOption.addEventListener("change", () => {
    const selectedValue = selectedOption.value;
    selectedActivity = activity.find((item) => item.name === selectedValue);
    const selectedUnit = selectedActivity.unit;

    activityDetails.innerHTML = `
      <label for="name">Name (Optional):</label>
      <input name="name" id="name" value="${selectedActivity.name}"></input>
      <label for="quantity">Quantity (${selectedUnit}):</label>
      <input name="quantity" id="quantity" placeholder="Enter weight in ${selectedUnit}"></input>
      <div id="total">
        <label for="totalCO2">Estimated CO₂ Emissions:</label>
        <input id="totalCO2" readonly />
        <span class="spanCategory">${selectedActivity.category}</span>
      </div>
      <button id="submit">Submit</button>
    `;

    const quantityInput = document.getElementById("quantity");
    const totalDiv = document.getElementById("totalCO2");
    calculateTotal(quantityInput, selectedActivity.co2Value, totalDiv);
    quantityInput.addEventListener("input", () => {
      calculateTotal(quantityInput, selectedActivity.co2Value, totalDiv);
    });
    const submitBtn = document.getElementById("submit");
    const nameInput = document.getElementById("name");

    submitBtn.addEventListener("click", () => {
      const quantity = parseFloat(quantityInput.value);
      if (!selectActivity || isNaN(quantity)) {
        alert("Please select an activity and enter a valid quantity.");
        return;
      }

      const selectedDate = document.getElementById("dateInput").value;
      const activityObj = {
        name: nameInput.value || selectedActivity.name,
        activity: selectedActivity.name,
        category: selectedActivity.category,
        unit: selectedActivity.unit,
        quantity: quantity,
        co2Value: selectedActivity.co2Value,
        totalC02: (quantity * selectedActivity.co2Value).toFixed(2),
      };

      let existingDay = allActivitiesArr.find(
        (day) => day.date === selectedDate
      );

      if (!existingDay) {
        existingDay = { date: selectedDate, activities: [] };
        allActivitiesArr.push(existingDay);
      }

      existingDay.activities.push(activityObj);

      activityDetails.innerHTML = ``;
      selectedOption.selectedIndex = 0;
      categoriesSelect.selectedIndex = 0;

      totalEmersion();
      todayAct(allActivitiesArr);
    });
  });
}

function setDate() {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("dateInput");
  dateInput.value = today;
  dateInput.min = today;
}

function totalEmersion() {
  const currentDate = document.getElementById("dateInput").value;

  let existingDay = allActivitiesArr.find((day) => day.date === currentDate);
  if (!existingDay) {
    document.getElementById("displayTotal").innerHTML = "0.0kg";
  } else {
    const total = existingDay.activities.reduce(
      (total, act) => total + Number(act.totalC02),
      0
    );
    document.getElementById("displayTotal").innerHTML = `${total.toFixed(2)}kg`;
  }
}

function todayAct(allActivitiesArr) {
  const currentDate = document.getElementById("dateInput").value;
  console.log(currentDate);
  let existingDay = allActivitiesArr.find((day) => day.date === currentDate);
  const todayActivities = document.getElementById("today-activities");

  const dynamicItems = todayActivities.querySelectorAll(
    ".allActivities, p, img"
  );
  dynamicItems.forEach((item) => item.remove());

  if (!existingDay) {
    const icon = document.createElement("img");
    icon.src = "./images.png";
    todayActivities.appendChild(icon);
    const noActivities = document.createElement("p");
    noActivities.textContent = "No activities for today.";
    todayActivities.appendChild(noActivities);
    noActivities.style.textAlign = "center";
    noActivities.style.fontSize = "20px";
    noActivities.style.color = "#666";
    icon.style.display = "block";
    icon.style.margin = "0 auto";
    icon.style.width = "100px";
    icon.style.height = "100px";
    renderBarChart([]); // No data for bar chart
  } else {
    const activities = existingDay.activities;
    const allActivities = document.querySelectorAll(".allActivities");
    allActivities.forEach((activity) => {
      activity.remove();
    });
    activities.forEach((activity) => {
      const activityDiv = document.createElement("div");
      activityDiv.classList.add("allActivities");
      activityDiv.innerHTML = `
      <div id="each-act">
        <p>${activity.category}</p>
        <p><strong>Activity:</strong> ${activity.name}</p>
        <span><strong>Quantity:</strong> ${activity.quantity}</span>
        <span><strong>Total CO2 Emissions:</strong> ${activity.totalC02} kg</span>
      </div>
      `;
      todayActivities.appendChild(activityDiv);
    });
    renderBarChart(activities); // ✅ Pass data to bar chart
  }
}

function filterActivities(date, category) {
  const day = allActivitiesArr.find((day) => day.date === date);

  if (!day) return [];

  if (category === "All-Categories") {
    return [day];
  }

  const filtered = day.activities.filter(
    (activity) => activity.category === category
  );
  return [{ date: date, activities: filtered }];
}

document.getElementById("dateInput").addEventListener("change", function () {
  totalEmersion();
  todayAct(allActivitiesArr);
});

document.getElementById("Categories").addEventListener("change", function () {
  const selectedCategory = this.value;
  const currentDate = document.getElementById("dateInput").value;
  const existingDay = allActivitiesArr.find((day) => day.date === currentDate);
  const filteredActivities = filterActivities(currentDate, selectedCategory);
  todayAct(filteredActivities);
  renderBarChart(existingDay ? existingDay.activities : []);
});

let barChartInstance = null;

function renderBarChart(activities) {
  const canvas = document.getElementById("barChart");
  const noDataMsg = document.getElementById("no-bar-data");
  const noDataImg = document.getElementById("no-bar-data-img");

  if (!activities || activities.length === 0) {
    canvas.style.display = "none";
    noDataMsg.style.display = "block";
    noDataImg.style.display = "block";
    return;
  }

  // Cleanup previous chart instance if it exists
  if (barChartInstance) {
    barChartInstance.destroy();
  }

  // Prepare labels and data
  const labels = activities.map((act) => act.name);
  const data = activities.map((act) => act.totalC02);

  canvas.style.display = "block";
  noDataMsg.style.display = "none";
  noDataImg.style.display = "none";

  const ctx = canvas.getContext("2d");

  barChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "CO2 Emissions (kg)",
          data: data,
          backgroundColor: "#36a2eb",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

setDate();
populateSelect();
selectActivity();
totalEmersion();
todayAct(allActivitiesArr);
