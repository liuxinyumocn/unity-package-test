#if IG_C111 || IG_C301 // Auto generated by AddMacroForInstantGameFiles.exe

using System.Collections.Generic;
using System.Linq;

using UnityEngine;
using UnityEngine.Assertions;
using UnityEditor;
using UnityEditor.IMGUI.Controls;

namespace Unity.AutoStreaming
{
    internal class ASMeshTreeDataItem : TreeDataItem
    {
        public AutoStreamingSettingsMesh MeshSettings { get; set; }

        public ASMeshTreeDataItem(AutoStreamingSettingsMesh inSettings, int depth, int id)
            : base(inSettings.assetPath, depth, id)
        {
            MeshSettings = inSettings;
        }

        public ASMeshTreeDataItem(string name, int depth, int id)
            : base(name, depth, id)
        {
        }
    }

    internal class ASMeshTreeView : TreeViewBaseT<ASMeshTreeDataItem>
    {
        enum MyColumns
        {
            AssetPath,
            RuntimeSize,
            OnDemandDownload,
            References,
            Warnings,
        }
        enum SortOption
        {
            AssetPath,
            RuntimeSize,
            OnDemandDownload,
            References,
            Warnings,
        }

        SortOption[] m_SortOptions =
        {
            SortOption.AssetPath,
            SortOption.RuntimeSize,
            SortOption.OnDemandDownload,
            SortOption.References,
            SortOption.Warnings,
        };

        private readonly GUIContent warningIcon = EditorGUIUtility.IconContent("console.warnicon.sml");

        public ASMeshTreeView(TreeViewState state, MultiColumnHeader multicolumnHeader, TreeModelT<ASMeshTreeDataItem> model) : base(state, multicolumnHeader, model)
        {
            // Custom setup
            rowHeight = k_RowHeights;

            columnIndexForTreeFoldouts = 0;
            showAlternatingRowBackgrounds = true;
            showBorder = true;
            customFoldoutYOffset = (k_RowHeights - EditorGUIUtility.singleLineHeight) * 0.5f; // center foldout in the row since we also center content. See RowGUI

            multicolumnHeader.sortingChanged += OnSortingChanged;

            Reload();
        }

        protected override void SortByMultipleColumns()
        {
            var sortedColumns = multiColumnHeader.state.sortedColumns;

            if (sortedColumns.Length == 0)
                return;

            var myTypes = rootItem.children.Cast<TreeViewItemBaseT<ASMeshTreeDataItem>>();
            var orderedQuery = InitialOrder(myTypes, sortedColumns);
            for (int i = 1; i < sortedColumns.Length; i++)
            {
                SortOption sortOption = m_SortOptions[sortedColumns[i]];
                bool ascending = multiColumnHeader.IsSortedAscending(sortedColumns[i]);

                switch (sortOption)
                {
                    case SortOption.AssetPath:
                        orderedQuery = orderedQuery.ThenBy(l => l.Data.Name, ascending);
                        break;
                    case SortOption.RuntimeSize:
                        orderedQuery = orderedQuery.ThenBy(l => l.Data.MeshSettings.runtimeMemory, ascending);
                        break;
                    case SortOption.OnDemandDownload:
                        orderedQuery = orderedQuery.ThenBy(l => l.Data.MeshSettings.onDemandDownload, ascending);
                        break;
                    case SortOption.References:
                        orderedQuery = orderedQuery.ThenBy(l => l.Data.MeshSettings.refs.Length, ascending);
                        break;
                    case SortOption.Warnings:
                        orderedQuery = orderedQuery.ThenBy(l => l.Data.MeshSettings.warningFlag, ascending);
                        break;
                }
            }

            rootItem.children = orderedQuery.Cast<TreeViewItem>().ToList();
        }

        IOrderedEnumerable<TreeViewItemBaseT<ASMeshTreeDataItem>> InitialOrder(IEnumerable<TreeViewItemBaseT<ASMeshTreeDataItem>> myTypes, int[] history)
        {
            SortOption sortOption = m_SortOptions[history[0]];
            bool ascending = multiColumnHeader.IsSortedAscending(history[0]);
            switch (sortOption)
            {
                case SortOption.AssetPath:
                    return myTypes.Order(l => l.Data.Name, ascending);
                case SortOption.RuntimeSize:
                    return myTypes.Order(l => l.Data.MeshSettings.runtimeMemory, ascending);
                case SortOption.OnDemandDownload:
                    return myTypes.Order(l => l.Data.MeshSettings.onDemandDownload, ascending);
                case SortOption.References:
                    return myTypes.Order(l => l.Data.MeshSettings.refs.Length, ascending);
                case SortOption.Warnings:
                    return myTypes.Order(l => l.Data.MeshSettings.warningFlag, ascending);
                default:
                    Assert.IsTrue(false, "Unhandled enum");
                    break;
            }

            // default
            return myTypes.Order(l => l.Data.Name, ascending);
        }

        public static MultiColumnHeaderState CreateDefaultMultiColumnHeaderState(float treeViewWidth)
        {
            var columns = new[]
            {
                new MultiColumnHeaderState.Column
                {
                    headerContent = new GUIContent("AssetPath"),
                    headerTextAlignment = TextAlignment.Left,
                    sortedAscending = true,
                    sortingArrowAlignment = TextAlignment.Center,
                    width = 500,
                    minWidth = 100,
                    autoResize = false,
                    allowToggleVisibility = false
                },
                new MultiColumnHeaderState.Column
                {
                    headerContent = new GUIContent("RT Mem"),
                    headerTextAlignment = TextAlignment.Left,
                    sortedAscending = true,
                    sortingArrowAlignment = TextAlignment.Center,
                    width = 70,
                    minWidth = 50,
                    autoResize = false,
                    allowToggleVisibility = false
                },
                new MultiColumnHeaderState.Column
                {
                    headerContent = new GUIContent("OnDemandDownload"),
                    headerTextAlignment = TextAlignment.Left,
                    sortedAscending = true,
                    sortingArrowAlignment = TextAlignment.Center,
                    width = 50,
                    minWidth = 50,
                    autoResize = false,
                    allowToggleVisibility = false
                },
                new MultiColumnHeaderState.Column
                {
                    headerContent = new GUIContent("References"),
                    headerTextAlignment = TextAlignment.Left,
                    sortedAscending = true,
                    sortingArrowAlignment = TextAlignment.Center,
                    width = 100,
                    minWidth = 100,
                    autoResize = false,
                    allowToggleVisibility = false
                },
                new MultiColumnHeaderState.Column
                {
                    headerContent = new GUIContent("Warning"),
                    headerTextAlignment = TextAlignment.Left,
                    sortedAscending = true,
                    sortingArrowAlignment = TextAlignment.Center,
                    width = 30,
                    minWidth = 20,
                    autoResize = false,
                    allowToggleVisibility = false
                },
            };

            // Assert.AreEqual(columns.Length, Enum.GetValues(typeof(MyColumns)).Length, "Number of columns should match number of enum values: You probably forgot to update one of them.");

            var state = new MultiColumnHeaderState(columns);
            return state;
        }

        override protected void SingleClickedItem(int id)
        {
            var meshItems = ASMainWindow.Instance.MeshData;

            if (id < meshItems.Count)
            {
                var meshItem = meshItems[id];
                Selection.activeObject = meshItem.MeshSettings.obj;
            }
        }

        protected override void SelectionChanged(IList<int> selectedIds)
        {
            if (selectedIds.Count == 0)
                return;
            int id = selectedIds[0];
            var meshItems = ASMainWindow.Instance.MeshData;

            if (id < meshItems.Count)
            {
                var meshItem = meshItems[id];
                Selection.activeObject = meshItem.MeshSettings.obj;
            }
        }

        protected override void RowGUI(RowGUIArgs args)
        {
            var item = (TreeViewItemBaseT<ASMeshTreeDataItem>)args.item;

            for (int i = 0; i < args.GetNumVisibleColumns(); ++i)
            {
                CellGUI(args.GetCellRect(i), item, (MyColumns)args.GetColumn(i), ref args);
            }
        }

        void CellGUI(Rect cellRect, TreeViewItemBaseT<ASMeshTreeDataItem> item, MyColumns column, ref RowGUIArgs args)
        {
            // Center cell rect vertically (makes it easier to place controls, icons etc in the cells)
            CenterRectUsingSingleLineHeight(ref cellRect);

            switch (column)
            {
                case MyColumns.AssetPath:
                {
                    string value = item.Data.MeshSettings.assetPath;
                    DefaultGUI.Label(cellRect, value, args.selected, args.focused);
                }
                break;

                case MyColumns.RuntimeSize:
                {
                    string value = EditorUtility.FormatBytes(item.Data.MeshSettings.runtimeMemory);
                    DefaultGUI.Label(cellRect, value, args.selected, args.focused);
                }
                break;

                case MyColumns.OnDemandDownload:
                {
                    // Do toggle
                    Rect toggleRect = cellRect;
                    toggleRect.width = k_ToggleWidth;
                    if (toggleRect.xMax < cellRect.xMax)
                    {
                        bool isEnabled = EditorGUI.Toggle(toggleRect, item.Data.MeshSettings.onDemandDownload);
                        if (isEnabled != item.Data.MeshSettings.onDemandDownload)
                        {
                            IList<int> ids = GetSelection();
                            if (!ids.Contains(item.id))
                            {
                                var tmpSettings = item.Data.MeshSettings;
                                tmpSettings.onDemandDownload = isEnabled;
                            }
                            else
                            {
                                List<ASMeshTreeDataItem> elems = ASMainWindow.Instance.MeshData;
                                foreach (int id in ids)
                                {
                                    var tmpSettings = elems[id].MeshSettings;
                                    tmpSettings.onDemandDownload = isEnabled;
                                }
                            }
                        }
                    }
                }
                break;

                case MyColumns.References:
                {
                    string value = string.Join(",", item.Data.MeshSettings.refs.ToArray());
                    DefaultGUI.Label(cellRect, value, args.selected, args.focused);
                }
                break;

                case MyColumns.Warnings:
                {
                    if (item.Data.MeshSettings.warningFlag != 0)
                        EditorGUI.LabelField(cellRect, warningIcon);
                }
                break;
            }
        }
    }
}

#endif  // IG_C111 || IG_C301, Auto generated by AddMacroForInstantGameFiles.exe
