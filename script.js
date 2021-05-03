var age18 = document.getElementById('age18');
var age45 = document.getElementById('age45');
var weekNext = document.getElementById('weekNext');
var weekAfter = document.getElementById('weekAfter');
var results = document.getElementById('results');
var apiBase = 'https://cdn-api.co-vin.in/api/v2/';
var weekStartDate = null;

function getDate() {
  var date = new Date();
  var diff = date.getDate();
  if (weekNext.checked) {
    diff += 7;
  } else if (weekAfter.checked) {
    diff += 14;
  }

  weeekStart = new Date(date.setDate(diff));

  var month = ('0' + (weeekStart.getMonth() + 1)).slice(-2);
  var day = ('0' + weeekStart.getDate()).slice(-2);
  var year = weeekStart.getFullYear();
  weekStartDate = day + '-' + month + '-' + year;
  return weekStartDate;
}

function getAge() {
  return age18.checked ? 18 : 45;
}

function getUrlParam(key) {
  let value = '';
  var url = window.location.href;
  url.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, k, v) => {
    if (k === key) value = v;
  });
  return value;
}

function getDistrictIdfromName(stateId, districtName) {
  var districtId = 1;
  if (districts[stateId - 1]) {
    var foundDistrict = districts[stateId - 1].find((d) => {
      return d.district_name === districtName;
    });
    districtId = foundDistrict ? foundDistrict.district_id : districtId;
  }
  return districtId;
}

function changeState() {
  var stateId = $('#states').val();
  var stateDistricts = districts[stateId - 1];
  $('#districts').empty();
  $('#other-districts').html('| ');
  for (var index = 0; index < stateDistricts.length; index++) {
    $('#districts').append(
      '<option value="' +
        stateDistricts[index].district_id +
        '">' +
        stateDistricts[index].district_name +
        '</option>'
    );
    $('#other-districts').append(
      '<a href="/?state=' +
        stateId +
        '&age=18&district=' +
        stateDistricts[index].district_name.replaceAll(' ', '+') +
        '">' +
        stateDistricts[index].district_name +
        '</a> | '
    );
  }
}

function get(callback) {
  const state_id = $('#states').val();
  const district_id = $('#districts').val();
  var districtName = $('#districts  option:selected').text();
  const age = getAge();

  var pageUrl = new URL(window.location.origin + window.location.pathname);
  pageUrl.searchParams.append('state', state_id);
  pageUrl.searchParams.append('age', age);
  pageUrl.searchParams.append('district', districtName);

  window.history.pushState(null, null, pageUrl);
  document.title = districtName + ' Vaccine Availability';

  if (window.localStorage) {
    localStorage.setItem('state', state_id);
    localStorage.setItem('district', districtName);
    localStorage.setItem('age', age);
  }

  const date = getDate();

  $.get(
    apiBase +
      'appointment/sessions/public/calendarByDistrict?district_id=' +
      district_id +
      '&date=' +
      date
  )
    .done(function (data, textStatus, jqXHR) {
      callback(null, data);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      callback(textStatus, errorThrown);
    });
}

function check() {
  $(results).html('');
  get((err, res) => {
    if (err) {
      results.innerHTML = `Cowin servers are down. Please try again.`;
      return;
    }
    const date = getDate();
    const age = getAge();
    const available = res.centers.filter((center) => {
      return center.sessions.some(
        (s) => s.available_capacity > 0 && s.min_age_limit === age
      );
    });
    const template = (center) => `
            <li class="list-group-item">
                <b>${center.name}, ${center.pincode}</b>
                <a href="https://maps.google.com/?q=${encodeURI(
                  center.name + ', ' + center.pincode
                )}" target="_blank">
                  <img width="30px" src="/maps.png">
              </a>
              <br>
                ${center.sessions
                  .filter((s) => s.available_capacity > 0)
                  .map((s) => s.date + ': ' + s.available_capacity)
                  .join('<br>')}<br>
            </li>
        `;
    var districtName = $('#districts  option:selected').text();

    if (available.length === 0) {
      const state_id = $('#states').val();
      const district_id = $('#districts').val();
      var currentDate = new Date();

      $(results).html(
        '<div style="color: #9e9e9e;font-size: 14px;margin-top:5px; margin-bottom:10px;">Last Checked on: ' +
          currentDate.toLocaleString('en-IN', { hour12: true } + '</div>')
      );

      $(results).append(
        'Out of ' +
          res.centers.length +
          ' centers in ' +
          districtName +
          ', there are no centers available for a week starting from date ' +
          weekStartDate +
          ' for ' +
          age +
          '+ age category.'
      );

      $(results).append(
        "<br><br> Don't worry! You can check back another time by copying or sharing the following link 👇"
      );
      $(results).append(
        '<br><br><a href="/?state=' +
          state_id +
          '&age=' +
          age +
          '&district=' +
          districtName +
          '">' +
          age +
          '+ Vaccine availability in ' +
          districtName +
          '<a>'
      );
      $(results).append('<br><br>Stay safe!');
    } else {
      $(results).html(
        '<p style="margin-top:15px;">Vaccines for ' +
          age +
          '+ age group is available in ' +
          districtName +
          '! Please visit <a href="https://selfregistration.cowin.gov.in/" target="_blank">CoWin portal</a> to book your appointment.</p>'
      );
      $(results).append('<ul class="list-group">');
      $(results).append(available.map((c) => template(c)).join(' '));
      $(results).append('</ul>');
    }
  });
}

$(document).ready(function () {
  for (var index = 0; index < states.length; index++) {
    $('#states').append(
      '<option value="' +
        states[index].state_id +
        '">' +
        states[index].state_name +
        '</option>'
    );
  }

  var prevState = 1;
  var prevDistrict = 'Nicobar';
  var prevAge = 18;

  if (getUrlParam('state') && getUrlParam('district') && getUrlParam('age')) {
    // Get from url parameter
    prevState = getUrlParam('state');
    prevDistrict = decodeURIComponent(getUrlParam('district')).replaceAll(
      '+',
      ' '
    );
    prevAge = getUrlParam('age');
  } else if (
    window.localStorage &&
    localStorage.getItem('state') &&
    localStorage.getItem('district') &&
    localStorage.getItem('age')
  ) {
    // Get from local storage
    prevState = localStorage.getItem('state');
    prevDistrict = localStorage.getItem('district');
    prevAge = localStorage.getItem('age');
  }
  console.log(prevDistrict);

  prevDistrict = getDistrictIdfromName(prevState, prevDistrict);

  $('#states').val(prevState);
  if (prevAge === '45') {
    age45.checked = true;
  } else {
    age18.checked = true;
  }
  changeState();
  // Wait for dom to load select box
  setTimeout(function () {
    $('#districts').val(prevDistrict);
    check();
  }, 0);
});
