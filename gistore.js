'use strict';

function _interopDefault( ex ) { return ( ex && ( typeof ex === 'object' ) && 'default' in ex ) ? ex[ 'default' ] : ex; }

var axios = _interopDefault( require( 'axios' ) );

axios.defaults.baseURL = 'https://api.github.com';

const gistore = {
    $http: axios,
    token: false,
    gistId: false,
    setId( id )
    {
        this.gistId = id;
    },
    setToken( token )
    {
        axios.defaults.headers.common[ 'Authorization' ] = `token ${token}`;
        this.token = true;
    },
    getList()
    {
        if( !this.token ) return Promise.reject()
        return axios( { url: '/gists' } ).then( res => res.status == 200 ? res.data : Promise.reject( res ) )
    },
    getGist( id )
    {
        if( !this.token ) return Promise.reject()
        return axios( { url: `/gists/${id}` } ).then( res => res.status == 200 ? res.data : Promise.reject( res ) )
    },
    createGist( desc = 'create by gistore', files = { newDb: '' } )
    {
        if( !this.token ) return Promise.reject()
        for( let name in files )
        {
            files[ name ] = { content: JSON.stringify( files[ name ] ) };
        }
        let postConfig = {
            description: desc,
            public: false,
            files: files
        };
        return axios( { method: 'post', url: '/gists', data: postConfig } ).then( res => res.status == 201 ? res.data : Promise.reject( res ) )
    },
    editGist( id, files )
    {
        if( !this.token ) return Promise.reject()
        for( let name in files )
        {
            files[ name ] = { content: files[ name ] };
        }
        let postConfig = {
            public: false,
            files: files
        };
        return axios( { method: 'patch', url: '/gists/' + id, data: postConfig } ).then( res => res.status == 200 ? res.data : Promise.reject( res ) )
    },
    backUp( files, isJson = true )
    {
        if( !this.gistId ) return Promise.reject()
        if( isJson )
        {
            for( let name in files )
            {
                files[ name ] = JSON.stringify( files[ name ] );
            }
        }
        return this.editGist( this.gistId, files )
    },
    sync()
    {
        if( !this.gistId ) return Promise.reject()
        return axios( { url: `/gists/${this.gistId}` } )
            .then( res => res.status === 200 ? res.data : Promise.reject( res ) )
            .then( res =>
            {
                let ret = {};
                for( let name in res.files )
                {
                    ret[ name ] = res.files[ name ].content;
                    try
                    {
                        ret[ name ] = JSON.parse( ret[ name ] );
                    } catch( e ) { }
                }
                return ret
            }, err => Promise.reject( err ) )
    },
    createBackUp( desc, files )
    {
        return this.createGist( desc, files )
            .then( res =>
            {
                this.setId( res.id );
                return res.id
            } )
    }
};

module.exports = gistore;
