import type {NextPage} from 'next';
import {ChangeEvent, useEffect, useState} from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CheckBox from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import {DataGrid, GridColDef, GridValidRowModel} from '@mui/x-data-grid';
import {blue, green, orange, red, grey, yellow, common} from '@mui/material/colors';
import AxiosLib from 'axios';
import styles from '../styles/BaserowTable.module.css';

const BASEROW_ADDRESS = '';
const BASEROW_TOKEN = '';
const BASEROW_TABLE_ID = 0;
const BASEROW_VIEW_ID = 0;

const DEFAULT_STORAGE = window.localStorage;
const VALIDATE_STATUS = [200];
const STORAGE_KEY = 'baserow-viewer';
const TEXT_FIELD_STYLE = {m: '0.5rem'};

const LIGHT_COLOR_INDEX = 300;
const NORMAL_COLOR_INDEX = 600;
const DARK_COLOR_INDEX = 900;

type BaserowColors =
  | 'light-blue'
  | 'light-green'
  | 'light-orange'
  | 'light-red'
  | 'light-gray'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'gray'
  | 'dark-blue'
  | 'dark-green'
  | 'dark-orange'
  | 'dark-red'
  | 'dark-gray';

const COLOR_BASEROW_TO_MUI: Record<BaserowColors, string> = {
  'light-blue': blue[LIGHT_COLOR_INDEX],
  'light-green': green[LIGHT_COLOR_INDEX],
  'light-orange': orange[LIGHT_COLOR_INDEX],
  'light-red': red[LIGHT_COLOR_INDEX],
  'light-gray': grey[LIGHT_COLOR_INDEX],
  'blue': blue[NORMAL_COLOR_INDEX],
  'green': green[NORMAL_COLOR_INDEX],
  'orange': orange[NORMAL_COLOR_INDEX],
  'red': red[NORMAL_COLOR_INDEX],
  'gray': grey[NORMAL_COLOR_INDEX],
  'dark-blue': blue[DARK_COLOR_INDEX],
  'dark-green': green[DARK_COLOR_INDEX],
  'dark-orange': orange[DARK_COLOR_INDEX],
  'dark-red': red[DARK_COLOR_INDEX],
  'dark-gray': grey[DARK_COLOR_INDEX],
};

type BaserowFieldTypes =
  | 'boolean'
  | 'date'
  | 'text'
  | 'long_text'
  | 'single_select'
  | 'multiple_select'
  | 'file';

const BASEROW_FIELD_LONG_TEXT = 'long_text';

// const BASEROW_FIELD_SINGLE_SELECT = 'single_select';
// const BASEROW_FIELD_MULTIPLE_SELECT = 'multiple_select';
// const BASEROW_FIELD_FILE = 'file';
// const BASEROW_FIELD_BOOLEAN = 'boolean';
// const BASEROW_FIELD_DATE = 'date';
// const BASEROW_FIELD_TEXT = 'text';

const BASEROW_FIELD_MIN_WIDTH: Record<BaserowFieldTypes, number> = {
  boolean: 40,
  date: 80,
  text: 120,
  long_text: 240,
  single_select: 180,
  multiple_select: 180,
  file: 80,
};

interface PersistData {
  address: string;
  token: string;
  table: number;
  view: number;
}

interface BaserowField {
  id: number;
  name: string;
  table_id: number;
  order: number;
  primary: boolean;
  type: BaserowFieldTypes;
}
type BaserowFields = Array<BaserowField>;

interface BaserowSingleSelect {
  id: number,
  value: string,
  color: BaserowColors;
}
type BaserowMultipleSelect = Array<BaserowSingleSelect>;
interface BaserowThumbnail {
  url: string;
  width: number;
  height: number;
}
interface BaserowThumbnails {
  card_cover: BaserowThumbnail;
  tiny: BaserowThumbnail;
  small: BaserowThumbnail;
}
interface BaserowFile {
  url: string;
  thumbnails: BaserowThumbnails;
  visible_name: string;
  name: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  image_width: number;
  image_height: number;
  uploaded_at: string;
}
type BaserowFiles = Array<BaserowFile>;
type BaserowRecord =
  | null
  | BaserowSingleSelect
  | BaserowMultipleSelect
  | BaserowFiles
  | boolean
  | string
  | number;

interface BaserowRow extends Record<string, BaserowRecord> {
  id: number;
  order: number;
}

interface BaserowRows {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<BaserowRow>;
}

type MuiDataGridCol = GridColDef<GridValidRowModel, BaserowRecord, BaserowField>;

function getFieldsPath(table_id: string | number) {
  return `/database/fields/table/${table_id}/`;
}

function getRowsPath(
  table_id: string | number,
  view_id?: string | number,
  userFieldNames=true,
) {
  let params = 'user_field_names=' + (userFieldNames ? 'true' : 'false');
  if (view_id) {
    params += `&view_id=${view_id}`;
  }
  return `/database/rows/table/${table_id}/?${params}`;
}

function originToBaseUrl(origin: string) {
  if (origin[origin.length - 1] === '/') {
    return origin + 'api';
  } else {
    return origin + '/api';
  }
}

function baserowColorToMuiColor(colorName: BaserowColors) {
  try {
    return COLOR_BASEROW_TO_MUI[colorName];
  } catch (e) {
    return yellow[NORMAL_COLOR_INDEX];
  }
}

function getChipStyle(colorName: BaserowColors) {
  const bg = baserowColorToMuiColor(colorName);
  const fg = colorName.startsWith('light') ? common.black : common.white;
  return {backgroundColor: bg, color: fg};
}

function getFlex(field: BaserowField) {
  if (field.type === BASEROW_FIELD_LONG_TEXT) {
    return 1;
  }
  return undefined;
}

function getMinWidth(field: BaserowField) {
  try {
    return BASEROW_FIELD_MIN_WIDTH[field.type];
  } catch (e) {
    return -1;
  }
}

function createAxios(origin: string, token: string) {
  return AxiosLib.create({
    baseURL: originToBaseUrl(origin),
    headers: {Authorization: `Token ${token}`},
    validateStatus: (status) => {
      return VALIDATE_STATUS.includes(status);
    },
  });
}

function testNoValue(value: any): boolean {
  if (typeof value === 'undefined') {
    return true;
  } else {
    return value === null;
  }
}

function dataGridSortComparator(
  field: BaserowField,
  v1: BaserowRecord,
  v2: BaserowRecord,
) {
  if (field.type === 'single_select') {
    const r1 = v1 as BaserowSingleSelect;
    const r2 = v2 as BaserowSingleSelect;
    return r1.value.localeCompare(r2.value);
  } else if (field.type === 'multiple_select') {
    const r1 = v1 as BaserowMultipleSelect;
    const r2 = v2 as BaserowMultipleSelect;
    const r1v = r1.map(x => x.value).join(',');
    const r2v = r2.map(x => x.value).join(',');
    return r1v.localeCompare(r2v);
  } else {
    const r1 = `${v1}`;
    const r2 = `${v2}`;
    return r1.localeCompare(r2);
  }
}

function dataGridRenderCell(
  field: BaserowField,
  value: BaserowRecord,
  handlerFile: (file: BaserowFile) => void,
) {
  if (field.type === 'single_select') {
    const real = value as BaserowSingleSelect;
    return (
      <Chip label={real.value} sx={getChipStyle(real.color)} />
    );
  }

  if (field.type === 'multiple_select') {
    const real = value as BaserowMultipleSelect;
    return (
      <Stack direction="row" spacing={1}>
        {real.map(x => (<Chip key={x.id} label={x.value} sx={getChipStyle(x.color)} />))}
      </Stack>
    );
  }

  if (field.type === 'date') {
    const real = value as string;
    return <span>{real.toString()}</span>;
  }

  if (field.type === 'boolean') {
    if (!!value) {
      return <CheckBox />;
    } else {
      return <CheckBoxOutlineBlank />;
    }
  }

  if (field.type === 'long_text') {
    const real = value as string;
    return <p className={styles.longText}>{real}</p>;
  }

  if (field.type === 'text') {
    const real = value as string;
    return <span>{real}</span>;
  }

  if (field.type === 'file') {
    const real = value as BaserowFiles;
    return (
      <Stack direction="row" spacing={1}>
        {real.map(x => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.imageFile}
            key={x.name}
            src={x.thumbnails.tiny.url}
            alt={x.visible_name}
            width={x.thumbnails.tiny.width}
            height={x.thumbnails.tiny.height}
            onClick={() => handlerFile(x)}
          />
        ))}
      </Stack>
    );
  }

  return <span>{`${value}`}</span>;
}

function getDefaultPersist(): PersistData {
  return {
    address: BASEROW_ADDRESS,
    token: BASEROW_TOKEN,
    table: BASEROW_TABLE_ID,
    view: BASEROW_VIEW_ID,
  } as PersistData;
}

function readPersist(): PersistData {
  const data = DEFAULT_STORAGE.getItem(STORAGE_KEY);
  if (data === null) {
    return getDefaultPersist();
  } else {
    return JSON.parse(data) as PersistData;
  }
}

function writePersist(data: PersistData): void {
  DEFAULT_STORAGE.setItem(STORAGE_KEY, JSON.stringify(data));
}

const BaserowTable: NextPage = () => {
  const [fields, setFields] = useState<BaserowFields>();
  const [rows, setRows] = useState<BaserowRows>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState(readPersist());
  const [showDialog, setShowDialog] = useState(false);
  const [dialogFile, setDialogFile] = useState<BaserowFile>();

  const onChangeAddress = (event: ChangeEvent<HTMLInputElement>) => {
    setParams((prevState) => ({...prevState, address: event.target.value}));
  };
  const onChangeToken = (event: ChangeEvent<HTMLInputElement>) => {
    setParams((prevState) => ({...prevState, token: event.target.value}));
  };
  const onChangeTable = (event: ChangeEvent<HTMLInputElement>) => {
    setParams((prevState) => (
      {...prevState, table: Number.parseInt(event.target.value)}
    ));
  };
  const onChangeView = (event: ChangeEvent<HTMLInputElement>) => {
    setParams((prevState) => (
      {...prevState, view: Number.parseInt(event.target.value)}
    ));
  };

  const inputForm = (
    <div className={styles.tools}>
      <TextField
        required
        label="Address"
        defaultValue={params.address}
        sx={TEXT_FIELD_STYLE}
        onChange={onChangeAddress}
      ></TextField>
      <TextField
        required
        label="Token"
        type="password"
        defaultValue={params.token}
        sx={TEXT_FIELD_STYLE}
        onChange={onChangeToken}
      ></TextField>
      <TextField
        required
        label="Table ID"
        defaultValue={params.table}
        sx={TEXT_FIELD_STYLE}
        onChange={onChangeTable}
      ></TextField>
      <TextField
        label="View ID"
        defaultValue={params.view}
        sx={TEXT_FIELD_STYLE}
        onChange={onChangeView}
      ></TextField>
    </div>
  );

  const requestRows = async (p: PersistData) => {
    try {
      console.debug('Request baserow data ...');
      const axios = createAxios(p.address, p.token);
      const fields = await axios.get(getFieldsPath(p.table));
      const rows = await axios.get(getRowsPath(p.table, p.view));
      console.debug('Request result', fields, rows);
      setFields(() => fields.data);
      setRows(() => rows.data);
      setError(() => undefined);
      writePersist(p);
    } catch (e) {
      console.error('Request baserow data error', e);
      setError(() => `${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await requestRows(params);
    })();
  }, [params]);

  if (loading) {
    return <div className={styles.main}>
      {inputForm}
      <span>Now loading ...</span>
    </div>;
  }

  if (!!error) {
    return <div className={styles.main}>
      {inputForm}
      <span>{error}</span>
    </div>;
  }

  if (!fields) {
    return <div className={styles.main}>
      {inputForm}
      <span>No fields</span>
    </div>;
  }

  if (!rows) {
    return <div className={styles.main}>
      {inputForm}
      <span>No rows</span>
    </div>;
  }

  const onClickDialogOpen = (file: BaserowFile) => {
    setDialogFile(() => file);
    setShowDialog(true);
  };
  const onClickDialogClose = () => {
    setShowDialog(false);
  };

  const gridColumns: Array<MuiDataGridCol> = fields.map(x => ({
    field: x.name,
    flex: getFlex(x),
    minWidth: getMinWidth(x),
    sortComparator: (v1, v2) => {
      const noV1 = testNoValue(v1);
      const noV2 = testNoValue(v2);
      if (noV1 && noV2) {
        return 0;
      } else if (noV1 && !noV2) {
        return +1;
      } else if (!noV1 && noV2) {
        return -1;
      } else {
        console.assert(v1 !== null);
        console.assert(v2 !== null);
        console.assert(typeof v1 !== 'undefined');
        console.assert(typeof v2 !== 'undefined');
        return dataGridSortComparator(x, v1, v2);
      }
    },
    renderCell: (params) => {
      const value = params.value;
      if (testNoValue(value)) {
        return <div></div>;
      } else {
        console.assert(value !== null);
        console.assert(typeof value !== 'undefined');
        return dataGridRenderCell(x, value as BaserowRecord, onClickDialogOpen);
      }
    },
  }));
  const gridRows: Array<BaserowRow> = rows.results;

  const dialog = (
    <Dialog
      open={showDialog}
      onClose={onClickDialogClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {dialogFile?.visible_name}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dialogFile?.url}
            alt={dialogFile?.visible_name}
            width={dialogFile?.image_width}
            height={dialogFile?.image_height}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClickDialogClose} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <div className={styles.main}>
      {inputForm}

      <div style={{width: '100vw'}}>
        <DataGrid
          autoHeight
          rows={gridRows}
          columns={gridColumns}
          pageSize={100}
          rowsPerPageOptions={[5]}
          getRowHeight={() => 'auto'}
        ></DataGrid>
      </div>

      {dialog}
    </div>
  );
};

export default BaserowTable;
