import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteItem } from '../api';
import { ListItem } from '../components';
import { comparePurchaseUrgency, getUrgency } from '../utils/item';
import NoToken from '../components/NoToken';

const defaultDates = { startDate: '', endDate: '' };

export function List({ data, listToken, setListToken }) {
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState('');
	const [copied, setCopied] = useState('');
	const [urgencyTerm, setUrgencyTerm] = useState('ALL');
	const [custom, setCustom] = useState(defaultDates);

	const sortedFullList = useMemo(() => comparePurchaseUrgency(data), [data]);

	const updateRange = (e) => {
		if (e.target.name !== 'startDate' && e.target.name !== 'endDate') return;
		console.log(`range is updating with ${e.target.name}: ${e.target.value}`);
		const newDates = { ...custom, [e.target.name]: e.target.value };
		setCustom(newDates);
	};
	// place in a useEffect? but they are already in state vars - do they need to be? maybe just chain filter
	// alternately, run this function onChange for either the two inputs?
	const customDateRange = (start, end) => {
		// input values are yyyy-mm-dd strings (custom.startDate, custom.endDate)

		if (!start || !end) return () => true;
		const start_IN_MS = new Date(start).getTime();
		const end_IN_MS = new Date(end).getTime();
		console.log('I am running too');
		return (item) =>
			item.dateNextPurchased.toMillis() >= start_IN_MS &&
			item.dateNextPurchased.toMillis() < end_IN_MS;
	};

	useEffect(() => {
		if (copied) setTimeout(() => setCopied(''), 2000);
	}, [copied]);

	const filterList = (list) => {
		const cleanup = (inputString) => {
			return inputString.toLowerCase().trim().replace(/\s+/g, ' ');
		};
		return list.filter(({ name }) =>
			cleanup(name).includes(cleanup(searchTerm)),
		);
	};

	const clearSearchTerm = () => {
		setSearchTerm('');
	};

	const copyToken = () => {
		navigator.clipboard
			.writeText(listToken)
			.then(() => setCopied('Copied!'))
			.catch(() => setCopied('Not Copied.'));
	};

	const deleteList = () => {
		if (
			window.confirm(
				'Are you sure you want to delete your shopping list? This cannot be undone.',
			)
		) {
			const itemsToBeDeleted = [];
			data.forEach((item) => {
				itemsToBeDeleted.push(deleteItem(listToken, item.id));
			});
			Promise.all(itemsToBeDeleted)
				.catch((err) => {
					console.log(err);
				})
				.finally(() => {
					setListToken(null, 'tcl-shopping-list-token');
					navigate('/');
				});
		}
	};

	const handleChange = (e) => {
		setUrgencyTerm(e.target.value); //this is passed to getUrgency
	};

	return (
		<>
			{listToken ? (
				data.length > 1 ? (
					<div>
						<label>
							Find an item
							<input
								type="text"
								placeholder="start typing here..."
								id="filter"
								name="filter"
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
								}}
							/>
						</label>
						<button type="button" onClick={clearSearchTerm} aria-live="polite">
							clear
						</button>
						<fieldset>
							<legend>Search by custom purchase-by date range</legend>
							{/* are these input types accessible? */}
							<label>
								Start date:
								<input
									type="date"
									value={custom.startDate}
									name="startDate"
									max={custom.endDate}
									onChange={updateRange}
								/>
							</label>
							<label>
								End date:
								<input
									type="date"
									value={custom.endDate}
									name="endDate"
									min={custom.startDate}
									onChange={updateRange}
								/>
							</label>
							<button
								type="button"
								onClick={() => setCustom(defaultDates)}
								aria-live="polite"
							>
								Clear custom range
							</button>
						</fieldset>
						<div>
							<label>
								Show by urgency
								{/* some redundancy compared to full storage in listItem? */}
								<select
									value={urgencyTerm}
									onChange={(e) => handleChange(e)}
									name="urgency"
								>
									<option value="ALL">Choose urgency</option>
									<option value="SOON">Soon</option>
									<option value="KIND_OF_SOON">Kind Of Soon</option>
									<option value="NOT_SOON">Not Soon</option>
									<option value="OVERDUE">Overdue</option>
									<option value="INACTIVE">Inactive</option>
								</select>
							</label>
						</div>
						<div>
							<p>
								Copy token to allow others join your list:
								<button onClick={copyToken} id="token">
									{copied ? copied : listToken}
								</button>
							</p>
						</div>
						<ul>
							{filterList(sortedFullList)
								.filter((item) => item.name !== '')
								.filter(getUrgency(urgencyTerm))
								.filter(customDateRange(custom.startDate, custom.endDate))
								.map((item) => (
									<ListItem
										{...item}
										listToken={listToken}
										key={item.id}
										itemId={item.id}
									/>
								))}
						</ul>
						<button onClick={deleteList}>Delete List</button>
					</div>
				) : (
					<div>
						<h2>Welcome to your smart shopping list!</h2>
						<p>
							This app will learn from your purchasing habits and help you
							prioritize and plan your shopping list.
						</p>
						Copy token to share your list with others:
						<button onClick={copyToken} id="token">
							{copied ? copied : listToken}
						</button>
						<Link to="/add-item">
							<button type="button">Start adding items</button>
						</Link>
						<button onClick={deleteList}>Delete List</button>
					</div>
				)
			) : (
				<NoToken />
			)}
		</>
	);
}
