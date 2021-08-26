<div class='flex'>
    <p>
    moot is a dark theme designed to maintain syntax distinction for every hacker.
    Its design philosophy is based on the work of <a href='https://personal.sron.nl/~pault/'>Paul Tol</a>. Try it out!
    </p>
    <button class='flex transform' on:click={handleClick}>
        <img src='/vsc_logo.png' alt='vscode logo'> Get moot for VSCode
    </button>
</div>

<script>
function handleClick() {
    window.open('https://marketplace.visualstudio.com/items?itemName=GivenSuman.moot', '_self')
}
</script>

<style>
.flex {
    text-align: left;
    font-size: 1.1rem;
    max-width: 40ch;
    margin-bottom: 2em;
    position: static;
}
p {
    padding-left: 5%;
}
button {
    border-radius: 0.5em;
    padding: 0.5em;
    border-style: solid 2px;
    background-color: transparent;
    color: #bbbbbb;
    cursor: pointer;
    width: 100%;
    transition-duration: 0.2s;

    flex-direction: row;
}
button:hover {
    background-color: #bbbbbb;
    color: #1c2022;
    transform: scale(1.08);
}
img {
    height: 2em;
    padding-right: 1.5em;
}
a {
    text-decoration: none;
    color: #33bbee;
}
a:hover {
    text-decoration: underline;
}
</style>
