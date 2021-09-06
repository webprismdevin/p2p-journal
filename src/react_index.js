const e = React.createElement;

class Posts extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            posts: []
        };
    }

    componentDidMount(){
        this.getItems();
    }

    getItems = () => {
        items.map().once((item, id) => {
            if(item) {
                let newPosts = this.state.posts;
                newPosts.push({id: id, item: item});

                this.setState({posts: newPosts})
            }
        });
    }

    deleteItem = (id) => {
        items.get(id).put(null, () => this.getItems());
    }

    render(){
        let postList = this.state.posts.map(p => <div key={p.id}>{p.item.data} <span onClick={() => this.deleteItem(p.id)}>&times;</span></div>);
        return(
            <div>
                <div>{postList}</div>
            </div>
        )
    }
}

class Auth extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            user: user.recall({sessionStorage: true}),
        };
    }

    handleLogIn = () => {
        this.setState({user: user});
    }

    handleLogOut = () => {
        this.state.user.leave({}, this.setState({user: user}));
    }

    signUp = () => {
        this.state.user.create(this.state.alias, this.state.password, this.handleLogIn);
    }

    signIn = () => {
        this.state.user.auth(this.state.alias, this.state.password, this.handleLogIn);
    }

    render() {
        let user = this.state.user;

        return(
            <div>
                {!user.is && 
                    <div id="sign">
                        <input id="alias" placeholder="username" onChange={(e) => this.setState({alias: e.target.value})}/>
                        <input id="pass" type="password" placeholder="passphrase" onChange={(e) => this.setState({password: e.target.value})}/>
                        <button id="in" onClick={this.signIn}>Sign In</button>
                        <button id="up" onClick={this.signUp}>Sign Up</button>
                    </div>
                }
                {user.is && <div>{user.is.pub}</div>}
                {user.is && <button onClick={this.handleLogOut}>Log out</button>}
            </div>
        )
    }
}

const authContainer = document.querySelector('#auth');
ReactDOM.render(e(Auth), authContainer);

const postsContainer = document.querySelector('#posts');
ReactDOM.render(e(Posts), postsContainer);