/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteItem } from '../api';
import { ListItem } from '../components';
import { comparePurchaseUrgency, getUrgency } from '../utils/item';
import {
	removeList,
	getFirstToken,
	getMatchingName,
	getUserListsArr,
	updateName,
	isDuplicateName,
} from '../utils/user';
import { isEmpty } from '../utils';
import NoToken from '../components/NoToken';

import ListTitle from '../components/ListTitle';
import { MyContext } from '../App';
import { AddItem } from '../components/AddItem';

const defaultDates = { startDate: '', endDate: '' };

export function List() {
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState('');
	const [copied, setCopied] = useState('');
	const [urgencyTerm, setUrgencyTerm] = useState('ALL');
	const [custom, setCustom] = useState(defaultDates);
	const [isDisabled, setIsDisabled] = useState(true);

	const [listToken, setListToken] = useContext(MyContext).listTokenCtx;
	const [userList, setUserList] = useContext(MyContext).userListCtx;
	const [data] = useContext(MyContext).dataCtx;
	const [adjustedData, setAdjustedData] = useContext(MyContext).adjustedDataCtx;

	const [listName, setListName] = useState('');

	const sortedFullList = useMemo(() => comparePurchaseUrgency(data), [data]);
	useEffect(() => {
		setAdjustedData(
			filterList(sortedFullList)
				.filter((item) => item.name !== '')
				.filter(getUrgency(urgencyTerm))
				.filter(customDateRange(custom.startDate, custom.endDate)),
		);
	}, [urgencyTerm, sortedFullList, custom]);

	const updateRange = (e) => {
		if (e.target.name !== 'startDate' && e.target.name !== 'endDate') return;
		const newDates = { ...custom, [e.target.name]: e.target.value };
		setCustom(newDates);
	};

	const customDateRange = (start, end) => {
		if (!start || !end) return () => true;
		const start_IN_MS = new Date(start).getTime();
		const end_IN_MS = new Date(end).getTime();
		return (item) =>
			item.dateNextPurchased.toMillis() >= start_IN_MS &&
			item.dateNextPurchased.toMillis() < end_IN_MS;
	};

	const undoUrgency = () => {
		setUrgencyTerm('ALL');
	};

	useEffect(() => {
		if (listToken === 'null') {
			setUserList('{}');
			return;
		}
		if (!getUserListsArr(userList).length) {
			setListName('');
			return;
		}

		if (listName !== getMatchingName(userList, listToken)) {
			setListName(getMatchingName(userList, listToken));
		}
	}, [userList, listToken]);

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
					const updatedList = removeList(
						userList,
						getMatchingName(userList, listToken),
					);
					setUserList(updatedList);
					setListToken(getFirstToken(JSON.parse(updatedList)));
					navigate('/');
				});
		}
	};

	const editName = (e) => {
		e.preventDefault();
		setIsDisabled(!isDisabled);

		if (isDisabled) return;

		if (isEmpty(listName) || isDuplicateName(userList, listName, listToken)) {
			setListName(listToken);
			setUserList(updateName(userList, listToken));
		} else setUserList(updateName(userList, listToken, listName));
	};

	const updateListName = (e) => {
		setListName(e.target.value);
	};

	return (
		<>
			{listToken && listToken !== 'null' ? (
				data.length > 1 ? (
					<div>
						<ListTitle
							editName={editName}
							isDisabled={isDisabled}
							updateListName={updateListName}
							listName={listName}
						/>
						<AddItem />
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
								<select
									value={urgencyTerm}
									onChange={(e) => setUrgencyTerm(e.target.value)}
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
							<button type="button" onClick={undoUrgency} aria-live="polite">
								Clear urgency selection
							</button>
						</div>

						<div>
							<p>
								Copy token to allow others join your list:
								<button type="button" onClick={copyToken} id="token">
									{copied ? copied : listToken}
								</button>
							</p>
						</div>
						<ul>
							{adjustedData.map((item) => (
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
						<AddItem />
						<ListTitle
							editName={editName}
							isDisabled={isDisabled}
							updateListName={updateListName}
							listName={listName}
						/>

						<button onClick={deleteList}>Delete List</button>
					</div>
				)
			) : (
				<NoToken />
			)}
		</>
	);
}
