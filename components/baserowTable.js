import styles from '../styles/BaserowTable.module.css'

import {useEffect, useState} from 'react';
import AxiosLib from 'axios';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CheckBox from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import {blue, green, orange, red, grey, yellow, common} from '@mui/material/colors';
import {DataGrid} from '@mui/x-data-grid';

const BASEROW_ADDRESS = '';
const BASEROW_TOKEN = '';
const BASEROW_TABLE_ID = 0;
const BASEROW_VIEW_ID = 0;

const DEFAULT_STORAGE = window.localStorage;
const VALIDATE_STATUS = [200];
const STORAGE_KEY = 'baserow-viewer';
const TEXT_FIELD_STYLE = {m: '0.5rem'};

function getFieldsPath(table_id) {
  return `/database/fields/table/${table_id}/`;
}

function getRowsPath(table_id, view_id) {
  return `/database/rows/table/${table_id}/?user_field_names=true&view_id=${view_id}`;
}

function originToBaseUrl(origin) {
  if (origin[origin.length - 1] === '/') {
    return origin + 'api';
  } else {
    return origin + '/api';
  }
}

const LIGHT_COLOR_INDEX = 100;
const NORMAL_COLOR_INDEX = 500;
const DARK_COLOR_INDEX = 900;

function baserowColorToMuiColor(name) {
  switch (name) {
    case 'light-blue':
      return blue[LIGHT_COLOR_INDEX];
    case 'light-green':
      return green[LIGHT_COLOR_INDEX];
    case 'light-orange':
      return orange[LIGHT_COLOR_INDEX];
    case 'light-red':
      return red[LIGHT_COLOR_INDEX];
    case 'light-gray':
      return grey[LIGHT_COLOR_INDEX];
    case 'blue':
      return blue[NORMAL_COLOR_INDEX];
    case 'green':
      return green[NORMAL_COLOR_INDEX];
    case 'orange':
      return orange[NORMAL_COLOR_INDEX];
    case 'red':
      return red[NORMAL_COLOR_INDEX];
    case 'gray':
      return grey[NORMAL_COLOR_INDEX];
    case 'dark-blue':
      return blue[DARK_COLOR_INDEX];
    case 'dark-green':
      return green[DARK_COLOR_INDEX];
    case 'dark-orange':
      return orange[DARK_COLOR_INDEX];
    case 'dark-red':
      return red[DARK_COLOR_INDEX];
    case 'dark-gray':
      return grey[DARK_COLOR_INDEX];
    default:
      return yellow[NORMAL_COLOR_INDEX];
  }
}

function getChipStyle(color) {
  const bg = baserowColorToMuiColor(color);
  const fg = color.startsWith('light') ? common.black : common.white;
  return {backgroundColor: bg, color: fg};
}

function getFlexSize(field) {
  if (field.type === 'long_text') {
    return 1;
  }
  return undefined;
}

function getMinWidth(field) {
  if (field.type === 'boolean') {
    return 40;
  } else if (field.type === 'date') {
    return 80;
  } else if (field.type === 'text') {
    return 120;
  } else if (field.type === 'single_select') {
    return 180;
  } else if (field.type === 'multiple_select') {
    return 180;
  } else if (field.type === 'file') {
    return 80;
  }
  return 240;
}

function createAxios(origin, token) {
  return AxiosLib.create({
    baseURL: originToBaseUrl(origin),
    headers: {Authorization: `Token ${token}`},
    validateStatus: (status) => {
      return VALIDATE_STATUS.includes(status);
    },
  });
}

export default function BaserowTable() {
  const persistData = DEFAULT_STORAGE.getItem(STORAGE_KEY);
  const baserowAddress = persistData?.address ?? BASEROW_ADDRESS;
  const baserowToken = persistData?.token ?? BASEROW_TOKEN;
  const baserowTable = persistData?.table ?? BASEROW_TABLE_ID;
  const baserowView = persistData?.view ?? BASEROW_VIEW_ID;

  const [fields, setFields] = useState();
  const [rows, setRows] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState(
    {
      address: baserowAddress,
      token: baserowToken,
      table: baserowTable,
      view: baserowView,
    }
  );

  async function requestRows() {
    try {
      console.debug('Axios Request ...');
      const axios = createAxios(baserowAddress, baserowToken);
      const fields = await axios.get(getFieldsPath(baserowTable));
      const rows = await axios.get(getRowsPath(baserowTable, baserowView));
      setFields(() => fields.data);
      setRows(() => rows.data);
    } catch (e) {
      setError(() => e);
    } finally {
      console.debug('Axios Request Done');
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await requestRows();
    })();
  }, [params]);

  if (loading) {
    return <div>
      <span>Now loading ...</span>
    </div>
  }

  if (!!error) {
    return <div>
      <span>{error}</span>
    </div>
  }

  if (!fields) {
    return <div>
      <span>No fields</span>
    </div>
  }

  if (!rows) {
    return <div>
      <span>No rows</span>
    </div>
  }

  const gridColumns = fields.map(x => ({
    field: x.name,
    flex: getFlexSize(x),
    minWidth: getMinWidth(x),
    sortComparator: (v1, v2, param1, param2) => {
      if (v1 === null && v2 === null) {
        return 0;
      } else if (v1 === null && v2 !== null) {
        return +1;
      } else if (v1 !== null && v2 === null) {
        return -1;
      }

      console.assert(v1 !== null);
      console.assert(v2 !== null);

      console.debug('sortComparator', v1, v2);
      if (x.type === 'single_select') {
        return v1.value.localeCompare(v2.value);
      } else if (x.type === 'multiple_select') {
        const v1v = v1.value.map(x => x.value).join(',');
        const v2v = v2.value.map(x => x.value).join(',');
        return v1v.localeCompare(v2v.value);
      }
      return v1.localeCompare(v2);
    },
    renderCell: (params) => {
      const value = params.value;
      if (typeof value === 'undefined') {
        return <div></div>
      }
      if (value === null) {
        return <div></div>
      }

      if (x.type === 'single_select') {
        return (
          <Stack direction="row" spacing={1}>
            <Chip label={value.value} sx={getChipStyle(value.color)} />
          </Stack>
        );
      }

      if (x.type === 'multiple_select') {
        return (
          <Stack direction="row" spacing={1}>
            {value.map(x => (<Chip label={x.value} sx={getChipStyle(x.color)} />))}
          </Stack>
        );
      }

      if (x.type === 'date') {
        return <span>{value.toString()}</span>;
      }

      if (x.type === 'boolean') {
        if (value) {
          return <CheckBox />;
        } else {
          return <CheckBoxOutlineBlank />;
        }
      }

      if (x.type === 'long_text') {
        return <p className={styles.longText}>{`${value}`}</p>;
      }

      if (x.type === 'text') {
        return <span>{value.toString()}</span>;
      }

      return <span>{value.toString()}</span>;
    },
  }));
  const gridRows = rows.results;

  return (
    <div className={styles.main}>
      <div className={styles.tools}>
        <TextField
          required
          label="Address"
          defaultValue={baserowAddress}
          sx={TEXT_FIELD_STYLE}
        ></TextField>
        <TextField
          required
          label="Token"
          type="password"
          defaultValue={baserowToken}
          sx={TEXT_FIELD_STYLE}
        ></TextField>
        <TextField
          required
          label="Table ID"
          defaultValue={baserowTable}
          sx={TEXT_FIELD_STYLE}
        ></TextField>
        <TextField
          label="View ID"
          defaultValue={baserowView}
          sx={TEXT_FIELD_STYLE}
        ></TextField>
      </div>

      <div style={{width: '100vw'}}>
        <DataGrid
          autoHeight
          wid
          rows={gridRows}
          columns={gridColumns}
          pageSize={100}
          rowsPerPageOptions={[5]}
          getRowHeight={() => 'auto'}
        ></DataGrid>
      </div>
    </div>
  )
}
