<template>
  <form class="flex flex-col gap-4 mr-auto mt-4 w-[500px]">
    <Text v-model="fullName" label="Full name" />
    <TextList v-model="textArrayList" label="Text List" />
    <KeyAndValueList
      v-model="keyAndValueArrayList"
      :text="{
        key_label: 'title',
        value_label: 'value',
        add_field: 'Add field',
        form_label: 'Forma',
      }"
    />
    <MultipleTextFields
      v-model="multipleTextArrayList"
      label="Work times"
      :label-array="[
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]"
    />
    <Decimal v-model="price" />
    <TextEditor v-model="notes" label="Notes" />
    <HtmlContentEditor
      v-model="htmlContent"
      api-origin="/"
      label="Html content"
    />
    <Checkbox v-model="isActive" label="Is active" />
    <Slider v-model="probability" label="Probability" />
    <SimpleSelect
      id="role-select"
      v-model="role"
      :config="{ options: roleOptions }"
      label="Select role"
    />
    <DataFetchingSelect
      id="user-select"
      v-model="user"
      :axios-instance="axiosInstance"
      :config="userSelectConfig"
      label="Select user"
    />
    <Datepicker v-model="dateOfBirth" label="Date of birth" />
    <DateTimePicker v-model="eventStartTime" label="Event starts at" />
    <RangeDatepicker v-model="eventDuration" label="Event duration" />
    <FileUpload
      v-model="profilePicture"
      allow-download
      allow-edit
      :axios-instance="axiosInstance"
      endpoint-url="/api/storage_items"
      label="Profile picture"
    />

    <FlatpickrTimePicker
      id="flatpickr-time-picker"
      v-model="attendanceTime"
      label="Flatpickr time picker"
    />
    <Map
      v-model="mapDataArray"
      label="Input address"
      :map-data="{
        googleApiKey: 'AIzaSyCAIwTPctnSM2PWcbK6cMdlZaSgEYIKp5U',
        initialLat: 56.946285,
        initialLng: 24.105078,
      }"
    />

    <div class="mb-[300px]">
      <button
        class="btn btn-primary"
        type="button"
        @click="showSelect = !showSelect"
      >
        Show/hide select
      </button>
      <div v-if="showSelect">
        <SimpleSelect
          id="role-select-2"
          v-model="role2"
          :config="{ options: roleOptions }"
          label="Select role"
        />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import axios from 'axios'
import Text from '../../components/Inputs/Text.vue'
import Decimal from '../../components/Inputs/Decimal.vue'
import TextEditor from '../../components/Inputs/TextEditor.vue'
import Checkbox from '../../components/Inputs/Checkbox.vue'
import Slider from '../../components/Inputs/Slider.vue'
import SimpleSelect from '../../components/Inputs/Selects/SimpleSelect.vue'
import DataFetchingSelect from '../../components/Inputs/Selects/DataFetchingSelect.vue'
import Datepicker from '../../components/Inputs/Datepicker.vue'
import DateTimePicker from '../../components/Inputs/DateTimePicker.vue'
import FileUpload from '../../components/Inputs/FileUpload/FileUpload.vue'
import RangeDatepicker from '../../components/Inputs/RangeDatepicker.vue'
import FlatpickrTimePicker from '../../components/Inputs/FlatpickrTimePicker.vue'
import { SelectOption } from '../../models/SelectOption'
import { DataFetchingSelectConfig } from '../../types/InputFields'
import HtmlContentEditor from '../../components/Inputs/HtmlContentEditor.vue'
import TextList from '../../components/Inputs/TextList.vue'
import KeyAndValueList from '../../components/Inputs/KeyAndValueList.vue'
import MultipleTextFields from '../../components/Inputs/MultipleTextFields.vue'
import Map from '../../components/Inputs/MapAddressSelector.vue'
const fullName = ref('')
const price = ref('9912,22')
const notes = ref('')
const isActive = ref(false)
const probability = ref(60)
const role = ref('')
const role2 = ref('')
const user = ref('')
const dateOfBirth = ref()
const eventStartTime = ref('')
const eventDuration = ref()
const profilePicture = ref()
const attendanceTime = ref('12:34')
const textArrayList = ref(['test', 'test2', 'test3'])
const keyAndValueArrayList = ref([{ key: 'test', value: 'test2' }])
const multipleTextArrayList = ref(['12:30', '13:30', '14:40'])
const mapDataArray = ref({
  address: 'Slokas iela 193',
  lat: 10.0,
  lng: 10.0,
})

const showSelect = ref(true)
watch(showSelect, (n) => {
  if (!n) role2.value = ''
})

const axiosInstance = axios.create()

const roleOptions = [
  new SelectOption('User', 'ROLE_USER'),
  new SelectOption('Admin', 'ROLE_ADMIN'),
  new SelectOption('Super admin', 'ROLE_SUPER_ADMIN'),
]
const userSelectConfig: DataFetchingSelectConfig = {
  requestUrlGenerator: (searchValue: string) =>
    `https://randomuser.me/api?name=${searchValue}`,
  responseMapFunction: () => new SelectOption('test', 'test'),
}

const htmlContent = ref(`
<h2>Heading 1</h2>
<h3>Heading 2</h3>
<h4>Heading 3</h4>
<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium ad alias blanditiis consectetur consequuntur delectus deleniti, est et fugit illum incidunt nemo, quam quas quo sint, tempore temporibus vel velit. </p>
<ul>
  <li>Stuff</li>
  <li>And</li>
  <li>Things</li>
</ul>
<ol>
   <li>Stuff</li>
   <li>And</li>
   <li>Things</li>
</ol>
<a href="www.example.com">Example link</a>
`)
</script>
