# LisAln (LIberal Sequence ALigNment)
LisAln Github Repo, under Dr. Hongzhi Li from City Of Hope

About LisAln: LisAln (LIberal Sequence ALigNment) is a hit-the-button website to find orthologs (same genes/proteins across species) and paralogs (similar genes/proteins inside human) of a protein for general scientists or amateurs. It is developed at City of Hope National Medical Center. Users can either input a protein name, fasta sequence, or fasta file to search for a protein. Users can also select the sequence range of human protein and name type for species (scientific or general names) to display the alignment results from EMBL Clustal Omega and Uniprot. LisAln will automatically search the orthologs and paralogs from NCBI Landmark and Homologene databases. It will pick the appropriate proteins to display the results of whole sequence alignments, local aligned sequences that users are interested in, phylogenetic trees, sequence identity heatmap, etc.

Authors: Hongzhi Li (holi@coh.org), Maggie Li, Sandra Li, Binghui Shen, and Daniel Ji, City of Hope National Medical Center, Duarte, California, USA

About website: Full stack web app built with React, Express.js, Node.js, Perl, and bash scripts. 

Dependencies (other than Node packages in backend): 
- Large UniProt database file that is not included (~3 gb). 
- Ensembl API (includes BioPerl and variuos Perl modules) 
- Gnuplot 
- Shell scripts are based on Bash shell


