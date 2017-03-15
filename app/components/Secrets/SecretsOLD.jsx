import React, { PropTypes } from 'react';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import { List, ListItem } from 'material-ui/List';
import Edit from 'material-ui/svg-icons/editor/mode-edit';
import Copy from 'material-ui/svg-icons/action/assignment';
import Checkbox from 'material-ui/Checkbox';
import styles from './secrets.css';
import _ from 'lodash';
import copy from 'copy-to-clipboard';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import DataInput from './DataInput.jsx';
import { green500, green400, red500, red300, yellow500, white } from 'material-ui/styles/colors.js'
import axios from 'axios';

const copyEvent = new CustomEvent("snackbar", {
    detail: {
        message: 'Copied!'
    }
});

class Secrets extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            openEditModal: false,
            openNewKeyModal: false,
            errorMessage: '',
            openDeleteModal: false,
            disableSubmit: false,
            disableTextField: false,
            focusKey: '',
            focusSecret: '',
            listBackends: false,
            secretBackends: [],
            secrets: [],
            namespace: '/secret',
            useRootKey: window.localStorage.getItem("useRootKey") === 'true' || false,
            rootKey: window.localStorage.getItem("secretsRootKey") || '',
            disableAddButton: false,
            buttonColor: 'lightgrey'
        };

        _.bindAll(
            this,
            'listSecretBackends',
            'getSecrets',
            'renderList',
            'renderNamespace',
            'clickSecret',
            'secretChanged',
            'updateSecret',
            'renderEditDialog',
            'renderNewKeyDialog',
            'renderDeleteConfirmationDialog',
            'copyText',
            'deleteKey'
        );
    }

    componentWillMount() {
        this.listSecretBackends();
        this.getSecrets(this.state.namespace);
    }

    copyText(value) {
        copy(value);
        document.dispatchEvent(copyEvent);
    }

    deleteKey(key) {
        let fullKey = `${this.state.namespace}/${key}`;
        axios.delete(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`)
            .then((resp) => {
                if (resp.status !== 204) {
                    console.error(resp.status);
                } else {
                    let secrets = this.state.secrets;
                    let secretToDelete = _.find(secrets, (secretToDelete) => { return secretToDelete.key == key; });
                    secrets = _.pull(secrets, secretToDelete);
                    this.setState({
                        secrets: secrets
                    });
                }
            })
            .catch((err) => {
                console.error(err.stack);
            });

        this.setState({
            deletingKey: '',
            openDeleteModal: false
        });
    }

    updateSecret(isNewKey) {
        let fullKey = `${this.state.namespace}/${this.state.focusKey}`;
        //Check if the secret is a json object, if so stringify it. This is needed to properly escape characters.
        let secret = typeof this.state.focusSecret == 'object' ? JSON.stringify(this.state.focusSecret) : this.state.focusSecret;

        axios.post(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`, { "vaultUrl": window.localStorage.getItem("vaultUrl"), "value": secret })
            .then((resp) => {
                if (isNewKey) {
                    let secrets = this.state.secrets;
                    let key = this.state.focusKey.includes('/') ? `${this.state.focusKey.split('/')[0]}/` : this.state.focusKey;
                    secrets.push({ key: key, value: this.state.focusSecret });
                    this.setState({
                        secrets: secrets
                    });
                }
            })
            .catch((err) => {
                console.error(err.stack);
            })
    }

    secretChanged(v) {
        let o = {}
        v.forEach(e => o[e[0]] = e[1]);
        this.state.focusSecret = JSON.stringify(o);
    }

    checkValidJson() {
        try {
            if (this.state.useRootKey) {
                JSON.parse(JSON.stringify(this.state.focusSecret));
            } else {
                JSON.parse(this.state.focusSecret);
            }
            this.setState({
                errorMessage: ''
            })
            return true;
        } catch (e) {
            this.setState({
                errorMessage: `Invalid JSON`
            })
            return false;
        }
    }

    renderEditDialog() {
        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openEditModal: false })} />,
            <FlatButton label="Submit" disabled={this.state.disableSubmit} primary={true} onTouchTap={() => submitUpdate()} />
        ];

        let submitUpdate = () => {
            if (!this.checkValidJson()) return;
            this.updateSecret(false);
            this.setState({ openEditModal: false });
        }

        return (
            <Dialog
                title={`Editing ${this.state.namespace}/${this.state.focusKey}`}
                modal={false}
                actions={actions}
                open={this.state.openEditModal}
                onRequestClose={() => this.setState({ openEditModal: false })}
                autoScrollBodyContent={true}
                >
                <DataInput
                    onChange={this.secretChanged}
                    values={JSON.parse(this.state.focusSecret)}/>
                <div className={styles.error}>{this.state.errorMessage}</div>
            </Dialog>
        );
    }

    renderDeleteConfirmationDialog() {
        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openDeleteModal: false, deletingKey: '' })} />,
            <FlatButton label="Delete" style={{ color: white }} hoverColor={red300} backgroundColor={red500} primary={true} onTouchTap={() => this.deleteKey(this.state.deletingKey)} />
        ];

        return (
            <Dialog
                title={`Delete Confirmation`}
                modal={false}
                actions={actions}
                open={this.state.openDeleteModal}
                onRequestClose={() => this.setState({ openDeleteModal: false, errorMessage: '' })}
                >

                <p>You are about to permanently delete {this.state.namespace}{this.state.deletingKey}.  Are you sure?</p>
                <em>To disable this prompt, visit the settings page.</em>
            </Dialog>
        )
    }

    renderNewKeyDialog() {
        const MISSING_KEY_ERROR = "Key cannot be empty.";
        const DUPLICATE_KEY_ERROR = `Key '${this.state.namespace}${this.state.focusKey}' already exists.`;

        let validateAndSubmit = (e, v) => {
            if (this.state.focusKey === '') {
                this.setState({
                    errorMessage: MISSING_KEY_ERROR
                });
                return;
            }

            if (_.filter(this.state.secrets, x => x.key === this.state.focusKey).length > 0) {
                this.setState({
                    errorMessage: DUPLICATE_KEY_ERROR
                });
                return;
            }
            if (!this.checkValidJson()) return;
            this.updateSecret(true);
            this.setState({ openNewKeyModal: false, errorMessage: '' });
        }

        const actions = [
            <FlatButton label="Cancel" primary={true} onTouchTap={() => this.setState({ openNewKeyModal: false, errorMessage: '' })} />,
            <FlatButton label="Submit" primary={true} onTouchTap={validateAndSubmit} />
        ];

        var rootKeyInfo;

        if (this.state.useRootKey) {
            rootKeyInfo = "Current Root Key: " + this.state.rootKey;
        } else {
            rootKeyInfo = "No Root Key set. Value must be JSON.";
        }

        return (
            <Dialog
                title={`New Key`}
                modal={false}
                actions={actions}
                open={this.state.openNewKeyModal}
                onRequestClose={() => this.setState({ openNewKeyModal: false, errorMessage: '' })}
                autoScrollBodyContent={true}
                >
                <TextField name="newKey" autoFocus fullWidth={true} hintText="Key" onChange={(e, v) => this.setState({ focusKey: v })} />
                <DataInput
                    name="newValue"
                    onChange={this.secretChanged} />
                <div className={styles.error}>{this.state.errorMessage}</div>
            </Dialog>
        );
    }

    listSecretBackends() {
        axios.get(`/listsecretbackends?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`)
            .then((resp) => {
                var secretBackends = [];
                _.forEach(Object.keys(resp.data.data), (key) => {
                    if (resp.data.data[key].type == "generic") {
                        secretBackends.push({ key: key });
                    }
                });
                this.setState({
                    secretBackends: secretBackends,
                    disableAddButton: false,
                    buttonColor: green500
                });
            })
            .catch((err) => {
                console.error(err.response.data);
                this.setState({
                    errorMessage: err.response.data,
                    disableAddButton: true,
                    buttonColor: 'lightgrey'
                });
            });
    }

    getSecrets(namespace) {
        axios.get(`/listsecrets?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}&namespace=${encodeURI(namespace)}`)
            .then((resp) => {
                var secrets = _.map(resp.data.data.keys, (key) => {
                    return {
                        key: key
                    }
                });

                this.setState({
                    namespace: namespace,
                    secrets: secrets,
                    disableAddButton: false,
                    buttonColor: green500
                });
            })
            .catch((err) => {
                console.error(err.response.data);
                this.setState({
                    errorMessage: err.response.data,
                    disableAddButton: true,
                    buttonColor: 'lightgrey'
                });
            });
    }

    clickSecret(key, isFullPath) {
        let isDir = key[key.length - 1] === '/';
        if (isDir) {
            if (isFullPath) {
                this.getSecrets(`${key}`);
            } else {
                this.getSecrets(`${this.state.namespace}/${key}`);
            }
        } else {
            let fullKey = `${this.state.namespace}/${key}`;
            axios.get(`/secret?vaultaddr=${encodeURI(window.localStorage.getItem("vaultUrl"))}&secret=${encodeURI(fullKey)}&token=${encodeURI(window.localStorage.getItem("vaultAccessToken"))}`)
                .then((resp) => {
                    let val = this.state.useRootKey ? _.get(resp, `data.${this.state.rootKey}`) : resp.data;
                    if (val === undefined) {
                        this.setState({
                            errorMessage: `No value exists under the root key '${this.state.rootKey}'.`,
                            focusSecret: '',
                            disableSubmit: true,
                            openEditModal: true,
                            disableTextField: true,
                            listBackends: false
                        });
                    } else {
                        val = typeof val == 'object' ? JSON.stringify(val) : val;
                        this.setState({
                            errorMessage: '',
                            disableSubmit: false,
                            disableTextField: false,
                            openEditModal: true,
                            focusKey: key,
                            focusSecret: val,
                            listBackends: false
                        });
                    }
                })
                .catch((err) => {
                    console.error(err.stack);
                });
        }
    }

    showDelete(key) {
        if (key[key.length - 1] === '/') {
            return (<IconButton />);
        } else {
            return (
                <IconButton
                    tooltip="Delete"
                    onTouchTap={() => {
                        if (window.localStorage.getItem("showDeleteModal") === 'false') {
                            this.deleteKey(key);
                        } else {
                            this.setState({ deletingKey: key, openDeleteModal: true })
                        }
                    } }
                    >
                    <FontIcon className="fa fa-times-circle" color={red500} />
                </IconButton>);
        }
    }

    renderList() {
        if (this.state.listBackends) {
            return _.map(this.state.secretBackends, (secretBackend) => {
                return (
                    <ListItem
                        style={{ marginLeft: -17 }}
                        key={secretBackend.key}
                        onTouchTap={() => {
                            this.setState(
                                {
                                    namespace: '/' + secretBackend.key,
                                    listBackends: false,
                                    secrets: this.getSecrets('/' + secretBackend.key)
                                })
                        } }
                        primaryText={<div className={styles.key}>{secretBackend.key}</div>}
                        //secondaryText={<div className={styles.key}>{secret.value}</div>}
                        >
                    </ListItem>
                );
            });
        } else {
            return _.map(this.state.secrets, (secret) => {
                return (
                    <ListItem
                        style={{ marginLeft: -17 }}
                        key={secret.key}
                        onTouchTap={() => { this.clickSecret(secret.key) } }
                        primaryText={<div className={styles.key}>{secret.key}</div>}
                        //secondaryText={<div className={styles.key}>{secret.value}</div>}
                        rightIconButton={this.showDelete(secret.key)}>
                    </ListItem>
                );
            });
        }
    }

    renderNamespace() {
        let namespaceParts = this.state.namespace.split('/');
        return (
            _.map(namespaceParts, (dir, index) => {
                if (index === 0) {
                    return (
                        <div style={{ display: 'inline-block' }} key={index}>
                            <span className={styles.link}
                                onTouchTap={() => this.setState(
                                    {
                                        listBackends: true,
                                        namespace: '/',
                                        disableAddButton: true,
                                        buttonColor: 'lightgrey'
                                    })}
                                >ROOT</span>
                            {index !== namespaceParts.length - 1 && <span>/</span>}
                        </div>
                    );
                }
                var link = [].concat(namespaceParts).slice(0, index + 1).join('/') + '/';
                return (
                    <div style={{ display: 'inline-block' }} key={index}>
                        <span className={styles.link}
                            onTouchTap={() => this.clickSecret(link, true)}>{dir.toUpperCase()}</span>
                        {index !== namespaceParts.length - 1 && <span>/</span>}
                    </div>
                );
            })
        );
    }

    render() {
        return (
            <div>
                {this.state.openEditModal && this.renderEditDialog()}
                {this.state.openNewKeyModal && this.renderNewKeyDialog()}
                {this.state.openDeleteModal && this.renderDeleteConfirmationDialog()}
                <h1 id={styles.welcomeHeadline}>Secrets</h1>
                <p>Here you can view, update, and delete keys stored in your Vault.  Just remember, <span className={styles.error}>deleting keys cannot be undone!</span></p>
                <FlatButton
                    label="Add Key"
                    backgroundColor={this.state.buttonColor}
                    disabled={this.state.disableAddButton}
                    hoverColor={green400}
                    labelStyle={{ color: white }}
                    onTouchTap={() => this.setState({ openNewKeyModal: true, focusKey: '', focusSecret: '', errorMessage: '' })} />
                <div className={styles.namespace}>{this.renderNamespace()}</div>
                <List>
                    {this.renderList()}
                </List>
            </div>
        );
    }
}

export default Secrets;
