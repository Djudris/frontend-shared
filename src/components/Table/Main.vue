<template>
  <div class="overflow-x-auto relative scrollbar-hidden" data-test="table">
    <div class="tabulator tabulator-top-pagination-placeholder"></div>
    <div
      v-if="totalEntryCount"
      class="sm:absolute table-total-entry-count"
      data-test="table-total-entry-count"
    >
      <span>(Kopējais ierakstu skaits: {{ totalEntryCount }})</span>
    </div>
    <div
      id="tabulator"
      ref="table"
      class="table-report table-report--tabulator"
    ></div>
  </div>
</template>

<script setup lang="ts">
import Tabulator from 'tabulator-tables'
import { onMounted, ref, watch, onBeforeUnmount, PropType, nextTick } from 'vue'
import { handleTableAjaxError } from '../../helpers/Errors'
import createActionColumn, { CustomAction, renderIcons } from './ActionColumn'
import { TableConfig } from './createTableConfig'
import { ApiListResponse } from '../../types/ApiPlatform'
import { COLLAPSE_ORDER, createColumn } from './Column'
import { tableTranslations } from '../../helpers/Translations'

const props = defineProps({
  columns: {
    type: Array as PropType<Tabulator.ColumnDefinition[]>,
    required: true,
  },
  delete: {
    default: true,
    type: Boolean,
  },
  edit: {
    default: true,
    type: Boolean,
  },
  view: {
    default: false,
    type: Boolean,
  },
  created: {
    default: true,
    type: Boolean,
  },
  updated: {
    default: true,
    type: Boolean,
  },
  ajaxUrl: {
    required: false,
    type: String,
    default: null,
  },
  primaryField: {
    default: 'name',
    type: String,
  },
  movableRows: {
    type: Boolean,
    required: false,
    default: false,
  },
  disableOrderByDateColumns: {
    type: Boolean,
    required: false,
    default: false,
  },
  selectionColumn: {
    type: Boolean,
    required: false,
    default: false,
  },
  selectionCheckboxLabel: {
    type: String,
    required: false,
    default: 'Atzīmē, lai veidotu darījumu',
  },
  columnData: {
    type: Array,
    required: false,
    default: null,
  },
  page: {
    type: Number,
    required: false,
    default: 1,
  },
  pageSize: {
    type: Number,
    required: false,
    default: 30,
  },
  pageSizeParam: {
    type: String,
    required: false,
    default: 'size',
  },
  config: {
    type: Object as PropType<TableConfig>,
    required: true,
  },
  canUpdateRecordFunc: {
    type: Function as PropType<(cell: Tabulator.CellComponent) => boolean>,
    required: false,
    default: () => () => true,
  },
  tabulatorOptions: {
    type: Object as PropType<Tabulator.Options>,
    required: false,
    default: () => ({}),
  },
  customActions: {
    type: Array as PropType<CustomAction[]>,
    required: false,
    default: null,
  },
  paginationSizeSelector: {
    type: Array as PropType<Array<number | boolean>>,
    required: false,
    default: () => [10, 30, 100],
  },
})

const emit = defineEmits([
  'edit-click',
  'delete-click',
  'view-click',
  'move-row',
  'set:filters',
  'row-selection-changed',
  'cell-click',
  'pagination-changed',
  'total-entry-count-changed',
])

const table = ref()
const tabulator = ref()
const totalEntryCount = ref<number | null>(null)

const reInitTable = () => {
  tabulator.value.redraw()
}

const reInitOnResizeWindow = () => {
  window.addEventListener('resize', reInitTable)
}

onMounted(() => {
  initTabulator()
  reInitOnResizeWindow()
})

onBeforeUnmount(() => window.removeEventListener('resize', reInitTable))

watch(
  () => props.ajaxUrl,
  () => {
    reload()
  }
)

watch(totalEntryCount, (n, o) => {
  if (n !== o) emit('total-entry-count-changed', n)
})

const createTimestampColumn = (
  title: string,
  field: string,
  hideLast: boolean
): Tabulator.ColumnDefinition =>
  createColumn({
    title: title,
    field: field,
    width: 150,
    formatter: (cell) => props.config.dateTimeFormatter(cell.getValue()),
    headerSort: !props.disableOrderByDateColumns,
    responsive: hideLast ? COLLAPSE_ORDER.first : COLLAPSE_ORDER.second,
  })

const createdColumn = createTimestampColumn(
  'IZVEIDOTS',
  props.config.sharedColumnNames.created,
  true
)
const updatedColumn = createTimestampColumn(
  'ATJAUNOTS',
  props.config.sharedColumnNames.updated,
  false
)

const actionColumn = createActionColumn(props, {
  edit: (resource) => emit('edit-click', resource),
  delete: (resource) => emit('delete-click', resource),
  view: (resource) => emit('view-click', resource),
})

const selectionColumn: Tabulator.ColumnDefinition = {
  title: '',
  formatter: 'rowSelection',
  titleFormatter: 'rowSelection',
  hozAlign: 'left',
  headerHozAlign: 'left',
  headerSort: false,
  width: 40,
  cellClick: function (e: Event, cell: Tabulator.CellComponent) {
    cell.getRow().toggleSelect()
  },
  tooltip: props.selectionCheckboxLabel,
  headerTooltip: 'Atzīmēt visu',
  vertAlign: 'middle',
}

const columnsBefore: Tabulator.ColumnDefinition[] = []
const columnsAfter: Tabulator.ColumnDefinition[] = []

if (props.selectionColumn) {
  columnsBefore.push(selectionColumn)
}

if (props.created) {
  columnsAfter.push(createdColumn)
}

if (props.updated) {
  columnsAfter.push(updatedColumn)
}

if (props.view || props.edit || props.delete || props.customActions) {
  columnsAfter.push(actionColumn)
}

const columns = [...columnsBefore, ...props.columns, ...columnsAfter]

const filtersSet = ref(false)

const waitForToggleCollapseElementsRendered = (): Promise<
  NodeListOf<Element>
> => {
  return new Promise((resolve, reject) => {
    let totalTimePassed = 0
    const interval = setInterval(() => {
      if (totalTimePassed > 10000) {
        clearInterval(interval)
        reject('Total time passed exceeded 10 seconds!')
      }

      const elements = document.querySelectorAll(
        '.tabulator-responsive-collapse-toggle'
      )
      if (!elements.length) totalTimePassed += 100
      else {
        clearInterval(interval)
        resolve(elements)
      }
    }, 100)
  })
}

const setTableHeight = (): void => {
  setTimeout(() => {
    const tabulatorTableEl = document.querySelector('.tabulator-table')
    if (!tabulatorTableEl) return
    const headerHeight = 170 // tried calculating on the fly but it was flaky. 120 is the normal height, but headers can span multiple rows and 170 accommodates 3 header rows...
    const heightInPx = window.getComputedStyle(tabulatorTableEl).height
    const newTabulatorHeight = parseInt(heightInPx) + headerHeight
    tabulator.value.setHeight(newTabulatorHeight)
  }, 50)
}

let tabulatorScrollTop = 0

const initTabulator = async (resetPage = false) => {
  let options: Tabulator.Options = {
    paginationSizeSelector: props.paginationSizeSelector,
    paginationInitialPage: resetPage ? 1 : props.page,
    paginationSize: props.pageSize,
    paginationDataSent: {
      size: props.pageSizeParam as string,
    },
    layout: 'fitColumns',
    responsiveLayout: 'collapse',
    responsiveLayoutCollapseStartOpen: false,
    headerSort: true,
    placeholder: 'Netika atrasti dati',
    locale: 'lv',
    langs: tableTranslations,
    columns,
    movableRows: props.movableRows,
    rowMoved: function (row) {
      emit('move-row', row)
    },
    cellClick: function (e, cell) {
      emit('cell-click', cell.getField(), cell.getData())
    },
    rowSelectionChanged(selectedRowData) {
      emit('row-selection-changed', selectedRowData)
    },
    dataLoaded: async function () {
      try {
        const toggleCollapseElements =
          await waitForToggleCollapseElementsRendered()
        toggleCollapseElements.forEach((el) =>
          el.addEventListener('click', setTableHeight, true)
        )
      } catch (e) {
        console.error(e)
      }

      if (tabulator.value) {
        tabulator.value.rowManager.element.scrollTop = tabulatorScrollTop
      }
    },
    // dataProcessed() {
    //   console.log('processed')
    //   nextTick(renderIcons)
    // },
    scrollVertical(top) {
      nextTick(() => (tabulatorScrollTop = top))
    },
    tableBuilt(this: Tabulator) {
      nextTick(() => {
        if (!this.element.parentElement) {
          console.warn('Table element does not have parentElement!')
          return
        }

        const footer = this.element.querySelector(
          '.tabulator-footer'
        ) as HTMLElement | null
        if (!footer) return
        const topFooterContainer = this.element.parentElement.querySelector(
          '.tabulator-top-pagination-placeholder'
        ) as HTMLElement
        const footerClone = footer.cloneNode(true) as HTMLElement
        const topPaginator = footerClone.querySelector(
          '.tabulator-paginator'
        ) as HTMLElement
        topPaginator.innerHTML = ''
        topFooterContainer.innerHTML = ''
        topFooterContainer.appendChild(footerClone)

        const elSelectorToMoveToTop =
          '.tabulator-paginator>label, .tabulator-paginator>.tabulator-page-size'
        footer
          .querySelectorAll(elSelectorToMoveToTop)
          .forEach(function (this: HTMLElement, element) {
            ;(
              footer.querySelector('.tabulator-paginator') as HTMLElement
            ).removeChild(element)
            topPaginator.appendChild(element)
          })
      })
    },
  }

  if (props.ajaxUrl) {
    options = {
      ...options,
      ajaxURL: props.ajaxUrl,
      ajaxConfig: props.config.ajaxConfig,
      ajaxResponse: (url, params, response: ApiListResponse) => {
        const page = response['hydra:view']['hydra:last']
          ? response['hydra:view']['hydra:last'].split('page=')[1]
          : 1

        totalEntryCount.value = response['hydra:totalItems']

        if (!filtersSet.value) {
          emit('set:filters', response)
          filtersSet.value = true
        }
        return {
          last_page: page,
          data: response['hydra:member'],
        }
      },
      ajaxError(error) {
        handleTableAjaxError(error, props.config.tableErrorHandler)
      },
      pageLoaded: (pageno: number) => {
        if (!tabulator.value) return
        emit('pagination-changed', pageno, tabulator.value.getPageSize())
      },
      ajaxSorting: true,
      ajaxRequesting: function (url, params) {
        if (params.sorters.length > 0) {
          params[`order[${params.sorters[0]['field']}]`] =
            params.sorters[0]['dir']
        }
        delete params.sorters
        return params
      },
      ajaxLoaderLoading: `
        <div class="flex items-center justify-center" data-test="table-loading-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-32 h-32" style="margin:auto;background:0 0;display:block;shape-rendering:auto" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.9166666666666666s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(30 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.8333333333333334s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(60 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.75s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(90 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(120 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5833333333333334s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(150 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(180 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.4166666666666667s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(210 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(240 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.25s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(270 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.16666666666666666s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(300 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.08333333333333333s" repeatCount="indefinite"/></rect><rect x="47" y="24" rx="3" ry="6" width="6" height="12" fill="#1e40af" transform="rotate(330 50 50)"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"/></rect></svg>
        </div>`,
      pagination: 'remote',
      responsiveLayoutCollapseFormatter(data) {
        if (!data.length) return ''

        const table = document.createElement('table')
        table.classList.add('w-full')

        data.forEach((col, i) => {
          const row = document.createElement('tr')
          row.classList.add('flex', 'flex-wrap')
          if (i !== data.length - 1) {
            row.classList.add('border-b', 'border-slate-300')
          }

          const titleCell = document.createElement('td')
          const valueCell = document.createElement('td')
          titleCell.style.whiteSpace = 'initial'
          valueCell.style.whiteSpace = 'initial'
          titleCell.classList.add('basis-[20%]')
          valueCell.style.flexGrow = '4'

          col.title instanceof HTMLElement
            ? titleCell.appendChild(col.title)
            : (titleCell.innerHTML = '<strong>' + col.title + '</strong>')

          if (col.value) {
            col.value instanceof HTMLElement
              ? valueCell.appendChild(col.value)
              : (valueCell.innerHTML = col.value ?? '')
          }

          row.appendChild(titleCell)
          row.appendChild(valueCell)

          table.appendChild(row)
        })

        nextTick(renderIcons)

        return table
      },
    }
  } else if (props.columnData) {
    options = {
      ...options,
      data: props.columnData,
    }
  }

  if (props.tabulatorOptions) {
    options = {
      ...options,
      ...props.tabulatorOptions,
    }
  }

  if (props.config.axiosInstance) {
    options = {
      ...options,
      ajaxRequestFunc: function (url, config, params) {
        return props.config
          .axiosInstance!.get(url, { headers: config.headers, params })
          .then((response) => response.data)
      },
    }
  }

  tabulator.value = await new Tabulator(table.value, options)
}

nextTick(renderIcons)

const reload = () => {
  tabulator.value.destroy()
  initTabulator(true)
}

const refreshData = () => tabulator.value.setPage(tabulator.value.getPage())

const updateData = (data: any) => {
  tabulator.value.updateOrAddData([data])
}

const getActiveRows = () => tabulator.value.rowManager.activeRows

defineExpose({
  reload,
  updateData,
  getActiveRows,
  refreshData,
  instance: tabulator,
})
</script>

<style lang="scss">
$page-entry-count-switcher-width: 201px;

@media (min-width: 640px) {
  .table-total-entry-count {
    color: rgb(var(--color-slate-700) / var(--tw-text-opacity));
    top: 24px;
    left: calc(#{$page-entry-count-switcher-width} + 16px);
  }
}

.tabulator {
  .tabulator-header .tabulator-col {
    .tabulator-col-content {
      padding: 12px 8px !important;

      .tabulator-col-title {
        white-space: normal !important;
        text-overflow: clip !important;
      }
    }
  }

  .tabulator-headers {
    display: flex !important;
    align-items: center !important;
    width: max-content !important;
  }

  .tabulator-cell {
    padding: 12px 8px !important;
  }

  .tabulator-paginator {
    padding: 4px 0 8px 0;

    & > button {
      &:first-child {
        margin-left: auto;
      }
      &:last-child {
        margin-right: auto;
      }
    }
  }
}
</style>
