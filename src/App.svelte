<script>
import CodeBlock from './CodeBlock.svelte';
</script>

<main>
	<img id='logo' alt="moot logo" src="/moot_logo.png" />
	<div id='heading'>
		<h1>Call your methods with a moot point.</h1>
		<h3>Color-blind friendly syntax highlighting.</h3>
	</div>
	<div id='body'>
		<p>
			moot is a dark theme designed to maintain syntax distinction for every hacker. <br/>
			moot's design philosophy is based on the work of <a href='https://personal.sron.nl/~pault/'>Paul Tol</a>.
		</p>
		<a id='button' href='https://marketplace.visualstudio.com/items?itemName=GivenSuman.moot'>
			<img id='vsc' alt='visual studio code logo' src="https://img.icons8.com/color/48/000000/visual-studio-code-2019.png"/>Get moot for VSCode 
		</a>
	</div>
	<div id='code'>
	<CodeBlock />
	</div>
</main>

<style>
a {
	color: #33bbee;
}
#logo {
	height: 125px;
	width: 125px;
}
main {
	display: flex;
	flex-direction: column;
	align-items: center;
}
p {
	text-align: left;
}
#heading {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	text-align: center;
}
#body {
	text-align: center;
	margin: 50px 0;
	font-size: 1.2rem;
}
h1, h3 {
	margin: 10px;;
}
#button {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 5px;
	width: 100%;
	height: 60px;
	border-radius: 15px;
	cursor: pointer;
	border: solid 2px;
	border-color: #bbbbbb;
	background-color: transparent;
	color: #bbbbbb;
	font-weight: bold;
	transition-duration: 0.5s;
	text-decoration: none;
}
#button:hover {
	background: linear-gradient( 30deg, #bbbbbb, #818080);
	color: #1c2022;
	border-color: #1c2022;
}
#vsc {
	padding-right: 10px;
}
#code {
	width: 5px;
	overflow-x: visible;
	position: relative;
	right: 270px;
}
@media all and (max-width: 570px) {
	#code {
		position: relative;
		right: 40vw;
	}
}
</style>